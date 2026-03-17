-- Step 4: Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES members(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_not_deleted ON chat_messages(room_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE chat_messages IS 'Chat messages in rooms';
COMMENT ON COLUMN chat_messages.deleted_by IS 'Admin who deleted the message (NULL if deleted by sender)';