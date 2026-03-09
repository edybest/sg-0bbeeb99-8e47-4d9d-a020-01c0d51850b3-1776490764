-- Create member_sessions table for session management
CREATE TABLE IF NOT EXISTS member_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  user_agent text,
  ip_address text
);

-- Create index for fast session lookup
CREATE INDEX idx_member_sessions_token ON member_sessions(session_token);
CREATE INDEX idx_member_sessions_member_id ON member_sessions(member_id);
CREATE INDEX idx_member_sessions_expires ON member_sessions(expires_at);

-- Enable RLS
ALTER TABLE member_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Sessions are viewable by session owner"
  ON member_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = member_sessions.member_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sessions"
  ON member_sessions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete sessions"
  ON member_sessions FOR DELETE
  USING (is_admin(auth.uid()));

COMMENT ON TABLE member_sessions IS 'Session tokens for member authentication';
COMMENT ON COLUMN member_sessions.session_token IS 'Unique session token stored in cookie';
COMMENT ON COLUMN member_sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN member_sessions.last_accessed_at IS 'Last time session was used';