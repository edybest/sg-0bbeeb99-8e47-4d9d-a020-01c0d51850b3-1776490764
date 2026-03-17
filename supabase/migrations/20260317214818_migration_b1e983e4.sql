-- Step 3: Create chat_participants with ban/silent features
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT false,
  is_silenced BOOLEAN DEFAULT false,
  banned_at TIMESTAMPTZ,
  silenced_at TIMESTAMPTZ,
  banned_by UUID REFERENCES members(id) ON DELETE SET NULL,
  silenced_by UUID REFERENCES members(id) ON DELETE SET NULL,
  ban_reason TEXT,
  silence_reason TEXT,
  UNIQUE(room_id, member_id)
);

-- Indexes for performance
CREATE INDEX idx_chat_participants_room ON chat_participants(room_id);
CREATE INDEX idx_chat_participants_member ON chat_participants(member_id);
CREATE INDEX idx_chat_participants_banned ON chat_participants(is_banned) WHERE is_banned = true;
CREATE INDEX idx_chat_participants_silenced ON chat_participants(is_silenced) WHERE is_silenced = true;

COMMENT ON TABLE chat_participants IS 'Members participating in chat rooms with admin control features';
COMMENT ON COLUMN chat_participants.is_banned IS 'Admin can ban member from viewing/accessing this room';
COMMENT ON COLUMN chat_participants.is_silenced IS 'Admin can silence member (read-only, cannot send messages)';