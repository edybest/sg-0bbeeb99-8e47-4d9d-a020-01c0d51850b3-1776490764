-- Drop existing tables if any (in correct order)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_participants table
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, member_id)
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);
CREATE INDEX idx_chat_participants_room ON chat_participants(room_id);
CREATE INDEX idx_chat_participants_member ON chat_participants(member_id);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(room_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Members can view rooms they participate in"
  ON chat_rooms FOR SELECT
  USING (
    id IN (
      SELECT room_id FROM chat_participants
      WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Members can create chat rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Room creators can update their rooms"
  ON chat_rooms FOR UPDATE
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- RLS Policies for chat_participants
CREATE POLICY "Members can view participants in their rooms"
  ON chat_participants FOR SELECT
  USING (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Room creators can add participants"
  ON chat_participants FOR INSERT
  WITH CHECK (
    room_id IN (
      SELECT id FROM chat_rooms
      WHERE created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Members can update their own participant record"
  ON chat_participants FOR UPDATE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- RLS Policies for chat_messages
CREATE POLICY "Members can view messages in their rooms"
  ON chat_messages FOR SELECT
  USING (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Room participants can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    AND room_id IN (
      SELECT room_id FROM chat_participants
      WHERE member_id = sender_id
    )
  );

CREATE POLICY "Message senders can update their own messages"
  ON chat_messages FOR UPDATE
  USING (
    sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Message senders can delete their own messages"
  ON chat_messages FOR DELETE
  USING (
    sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Create trigger function to update last_message_at
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chat_rooms
  SET last_message_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_room_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_room_last_message();

-- Create helper function to get or create direct chat
CREATE OR REPLACE FUNCTION get_or_create_direct_chat(member1_id UUID, member2_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  room_id UUID;
  room_exists BOOLEAN;
BEGIN
  -- Check if direct chat already exists between these two members
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  WHERE cr.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM chat_participants cp1
      WHERE cp1.room_id = cr.id AND cp1.member_id = member1_id
    )
    AND EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.room_id = cr.id AND cp2.member_id = member2_id
    )
  LIMIT 1;

  -- If room exists, return it
  IF room_id IS NOT NULL THEN
    RETURN room_id;
  END IF;

  -- Create new direct chat room
  INSERT INTO chat_rooms (type, created_by)
  VALUES ('direct', member1_id)
  RETURNING id INTO room_id;

  -- Add both members as participants
  INSERT INTO chat_participants (room_id, member_id)
  VALUES (room_id, member1_id), (room_id, member2_id);

  RETURN room_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_direct_chat(UUID, UUID) IS 'Get existing direct chat or create new one between two members';