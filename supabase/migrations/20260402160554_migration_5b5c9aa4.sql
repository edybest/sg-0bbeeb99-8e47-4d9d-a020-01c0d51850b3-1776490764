-- Create table to track game viewers in real-time
CREATE TABLE IF NOT EXISTS game_viewers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT NOW(),
  last_seen timestamptz DEFAULT NOW(),
  UNIQUE(game_id, member_id)
);

-- Index for fast viewer count queries
CREATE INDEX IF NOT EXISTS idx_game_viewers_game_id ON game_viewers(game_id);
CREATE INDEX IF NOT EXISTS idx_game_viewers_last_seen ON game_viewers(last_seen);

-- RLS policies
ALTER TABLE game_viewers ENABLE ROW LEVEL SECURITY;

-- Anyone can see viewers
CREATE POLICY "public_read_viewers" ON game_viewers
FOR SELECT USING (true);

-- Members can insert/update their own presence
CREATE POLICY "members_manage_own_presence" ON game_viewers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.id = game_viewers.member_id
  )
);

-- Function to clean up stale viewers (last seen > 2 minutes ago)
CREATE OR REPLACE FUNCTION cleanup_stale_viewers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM game_viewers
  WHERE last_seen < NOW() - INTERVAL '2 minutes';
END;
$$;