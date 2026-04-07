-- ================================================
-- CRITICAL DATABASE INDEXES FOR PERFORMANCE
-- ================================================

-- 1. Game Comments - Speed up loading active comments by game
-- Common query: Get all non-deleted comments for a specific game, sorted by date
CREATE INDEX IF NOT EXISTS idx_game_comments_game_active 
ON game_comments(game_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- 2. Members - Speed up filtering verified members
-- Common query: Get all verified members (login, member lists)
CREATE INDEX IF NOT EXISTS idx_members_verified_active 
ON members(is_verified, created_at DESC) 
WHERE is_verified = true;

-- 3. Training Scores - Speed up member's training history queries
-- Common query: Get member's training history with best scores
CREATE INDEX IF NOT EXISTS idx_training_scores_member_score 
ON training_scores(member_id, total_score DESC, training_date DESC);

-- 4. Couple Scores - Speed up couple leaderboard queries
-- Common query: Get top couples for a game sorted by score
CREATE INDEX IF NOT EXISTS idx_couple_scores_leaderboard 
ON couple_scores(game_id, overall_score DESC, couple_id);

-- 5. Lane Assignments - Speed up game lane lookup
-- Common query: Get all lane assignments for a specific game
CREATE INDEX IF NOT EXISTS idx_lane_assignments_game_lookup 
ON lane_assignments(game_id, lane_position);

-- 6. Mini Blok - Speed up owner's entries lookup
-- Common query: Get all mini blok entries by owner, sorted by date
CREATE INDEX IF NOT EXISTS idx_mini_blok_owner_date 
ON mini_blok(owner_id, date DESC);

-- 7. Game Players - Speed up member's game history
-- Common query: Get all games a member participated in
CREATE INDEX IF NOT EXISTS idx_game_players_member_games 
ON game_players(member_id, created_at DESC, game_id);

-- 8. Gallery Images - Speed up album image loading
-- Common query: Get all images in album, sorted by position
CREATE INDEX IF NOT EXISTS idx_gallery_images_album_position 
ON gallery_images(album_id, position_order ASC);

-- 9. Notifications - Speed up unread notifications lookup
-- Common query: Get unread notifications for a member
CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread_member 
ON notification_recipients(member_id, read_at) 
WHERE read_at IS NULL;

-- 10. Blok Games - Speed up member's blok history
-- Common query: Get member's blok games sorted by date and score
CREATE INDEX IF NOT EXISTS idx_blok_games_member_score 
ON blok_games(member_id, game_date DESC, total_score DESC);

COMMENT ON INDEX idx_game_comments_game_active IS 'Speed up loading active comments for a game';
COMMENT ON INDEX idx_members_verified_active IS 'Speed up filtering verified members for login';
COMMENT ON INDEX idx_training_scores_member_score IS 'Speed up member training history with rankings';
COMMENT ON INDEX idx_couple_scores_leaderboard IS 'Speed up couple leaderboard queries';
COMMENT ON INDEX idx_lane_assignments_game_lookup IS 'Speed up lane assignments lookup by game';
COMMENT ON INDEX idx_mini_blok_owner_date IS 'Speed up owner mini blok entries';
COMMENT ON INDEX idx_game_players_member_games IS 'Speed up member game history';
COMMENT ON INDEX idx_gallery_images_album_position IS 'Speed up gallery album image loading';
COMMENT ON INDEX idx_notification_recipients_unread_member IS 'Speed up unread notifications';
COMMENT ON INDEX idx_blok_games_member_score IS 'Speed up member blok games history';