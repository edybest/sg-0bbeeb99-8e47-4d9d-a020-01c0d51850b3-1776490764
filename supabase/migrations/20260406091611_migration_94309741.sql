-- Critical indexes for reaction/like features
CREATE INDEX IF NOT EXISTS idx_couple_reactions_couple_member 
  ON couple_reactions_log(couple_score_id, member_id);

CREATE INDEX IF NOT EXISTS idx_couple_reactions_game_member 
  ON couple_reactions_log(game_id, member_id);

CREATE INDEX IF NOT EXISTS idx_couple_reactions_member_created 
  ON couple_reactions_log(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_reactions_member_created 
  ON player_reactions_log(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_reactions_game_player 
  ON player_reactions_log(game_player_id);

-- Couple scores leaderboard performance
CREATE INDEX IF NOT EXISTS idx_couple_scores_game_overall 
  ON couple_scores(game_id, overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_couple_scores_couple 
  ON couple_scores(couple_id);

-- Notification system optimization
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification 
  ON notification_recipients(notification_id);

CREATE INDEX IF NOT EXISTS idx_notifications_target_created 
  ON notifications(target_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_target_date 
  ON notifications(target_date) WHERE target_date IS NOT NULL;

-- Game comments user history
CREATE INDEX IF NOT EXISTS idx_game_comments_member_created 
  ON game_comments(member_id, created_at DESC) WHERE deleted_at IS NULL;

-- Mini blok shares active check
CREATE INDEX IF NOT EXISTS idx_mini_blok_shares_active 
  ON mini_blok_shares(mini_blok_id, revoked_at, expires_at) 
  WHERE revoked_at IS NULL;

-- Training scores user history
CREATE INDEX IF NOT EXISTS idx_training_scores_member_date 
  ON training_scores(member_id, training_date DESC);

-- Blok games user history
CREATE INDEX IF NOT EXISTS idx_blok_games_member_date 
  ON blok_games(member_id, game_date DESC);

-- Game viewers active list optimization
CREATE INDEX IF NOT EXISTS idx_game_viewers_active 
  ON game_viewers(game_id, last_seen DESC);