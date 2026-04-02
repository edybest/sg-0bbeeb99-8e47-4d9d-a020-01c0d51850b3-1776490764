-- CRITICAL PRIORITY INDEXES (Auth & Member Queries)

-- 1. members.user_id - MOST CRITICAL (used in EVERY auth check)
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- 2. members.is_verified - Filtered in almost all member lists
CREATE INDEX IF NOT EXISTS idx_members_is_verified ON members(is_verified);

-- 3. Composite index for auth + verification (common pattern)
CREATE INDEX IF NOT EXISTS idx_members_user_verified ON members(user_id, is_verified) WHERE user_id IS NOT NULL;

-- HIGH PRIORITY INDEXES (Game Performance)

-- 4. game_players.created_at - Used in getMemberGameHistory ORDER BY
CREATE INDEX IF NOT EXISTS idx_game_players_created_at ON game_players(created_at DESC);

-- 5. game_players.overall_score - Used for leaderboards/rankings
CREATE INDEX IF NOT EXISTS idx_game_players_overall_score ON game_players(overall_score DESC);

-- 6. game_players.is_fivefive - Filtered in fivefive queries
CREATE INDEX IF NOT EXISTS idx_game_players_is_fivefive ON game_players(is_fivefive) WHERE is_fivefive = true;

-- 7. game_players composite for member history (member + date)
CREATE INDEX IF NOT EXISTS idx_game_players_member_created ON game_players(member_id, created_at DESC);

-- MEDIUM PRIORITY INDEXES (Chat Performance)

-- 8. chat_messages composite with deleted_at filter (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_not_deleted ON chat_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;

-- 9. chat_participants composite for faster permission checks
CREATE INDEX IF NOT EXISTS idx_chat_participants_member_not_banned ON chat_participants(member_id, room_id) WHERE is_banned = false;

-- BONUS OPTIMIZATION INDEXES

-- 10. games composite for type + official + date (common filter combo)
CREATE INDEX IF NOT EXISTS idx_games_type_official_date ON games(game_type, is_official, game_date DESC);

-- 11. member_sessions.last_accessed_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_member_sessions_last_accessed ON member_sessions(last_accessed_at DESC);

-- 12. notifications.created_at for recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);