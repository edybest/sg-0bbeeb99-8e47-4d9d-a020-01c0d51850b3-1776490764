-- Fix chat_messages policies to avoid circular dependency
-- Drop old policies
DROP POLICY IF EXISTS "Members can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;

-- Create NEW simple policies that check member_id directly
CREATE POLICY "Members can view messages in accessible rooms"
  ON chat_messages FOR SELECT
  USING (
    -- User is a participant in the room (not banned)
    EXISTS (
      SELECT 1 
      FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE cp.room_id = chat_messages.room_id
        AND m.user_id = auth.uid()
        AND cp.is_banned = false
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Participants can send messages if not silenced"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 
      FROM chat_participants cp
      WHERE cp.room_id = chat_messages.room_id
        AND cp.member_id = chat_messages.sender_id
        AND cp.is_banned = false
        AND cp.is_silenced = false
    )
  );