-- Create game_comments table for live comments on games
CREATE TABLE IF NOT EXISTS game_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  comment_text TEXT,
  emoji_code TEXT, -- Store emoji/icon code (e.g., '🎳', 'strike', 'spare')
  is_animated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES members(id)
);

-- Create comment_bans table to track banned users
CREATE TABLE IF NOT EXISTS comment_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE, -- NULL = global ban
  banned_by UUID NOT NULL REFERENCES members(id),
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
  is_active BOOLEAN DEFAULT true,
  UNIQUE(member_id, game_id) -- Prevent duplicate bans
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_comments_game ON game_comments(game_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_member ON game_comments(member_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_created ON game_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_bans_member ON comment_bans(member_id);
CREATE INDEX IF NOT EXISTS idx_comment_bans_game ON comment_bans(game_id);
CREATE INDEX IF NOT EXISTS idx_comment_bans_active ON comment_bans(is_active);

-- RLS Policies
ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_bans ENABLE ROW LEVEL SECURITY;

-- game_comments policies
CREATE POLICY "public_read_comments" ON game_comments FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "auth_insert_comments" ON game_comments FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  AND deleted_at IS NULL
);

CREATE POLICY "admin_delete_comments" ON game_comments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- comment_bans policies
CREATE POLICY "public_read_bans" ON comment_bans FOR SELECT USING (true);

CREATE POLICY "admin_manage_bans" ON comment_bans FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

COMMENT ON TABLE game_comments IS 'Live comments for games - TikTok style floating comments';
COMMENT ON TABLE comment_bans IS 'Banned users from posting comments';