-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_member 
  ON chat_participants(room_id, member_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_member 
  ON chat_participants(member_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room 
  ON chat_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
  ON chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type 
  ON chat_rooms(type, is_public);