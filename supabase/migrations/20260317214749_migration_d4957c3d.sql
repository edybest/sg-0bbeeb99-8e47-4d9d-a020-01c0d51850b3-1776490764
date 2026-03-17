-- Step 2: Create clean chat_rooms table with admin controls
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('lobby', 'direct', 'group')),
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);

COMMENT ON TABLE chat_rooms IS 'Chat rooms - lobby, direct messages, and group chats';
COMMENT ON COLUMN chat_rooms.type IS 'Room type: lobby (public chat for all), direct (1-on-1), group (multiple users)';
COMMENT ON COLUMN chat_rooms.is_public IS 'Whether room is publicly visible (true for lobby)';