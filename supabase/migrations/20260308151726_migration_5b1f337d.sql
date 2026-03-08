-- Fix 6: Add missing foreign key indexes for optimal query performance
-- These indexes will significantly speed up JOIN operations and foreign key lookups

-- Add index for fivefive_participants.fivefive_game_id
CREATE INDEX IF NOT EXISTS idx_fivefive_participants_game_id 
  ON fivefive_participants(fivefive_game_id);

-- Add index for fivefive_participants.member_id
CREATE INDEX IF NOT EXISTS idx_fivefive_participants_member_id 
  ON fivefive_participants(member_id);

-- Add index for game_players.game_id
CREATE INDEX IF NOT EXISTS idx_game_players_game_id 
  ON game_players(game_id);

-- Add index for game_players.member_id
CREATE INDEX IF NOT EXISTS idx_game_players_member_id 
  ON game_players(member_id);

-- Add index for lane_assignments.game_id
CREATE INDEX IF NOT EXISTS idx_lane_assignments_game_id 
  ON lane_assignments(game_id);

-- Add index for lane_assignments.member_id
CREATE INDEX IF NOT EXISTS idx_lane_assignments_member_id 
  ON lane_assignments(member_id);

-- Add index for training_scores.member_id
CREATE INDEX IF NOT EXISTS idx_training_scores_member_id 
  ON training_scores(member_id);

-- Add composite index for common game queries (game_id + member_id lookups)
CREATE INDEX IF NOT EXISTS idx_game_players_composite 
  ON game_players(game_id, member_id);

CREATE INDEX IF NOT EXISTS idx_lane_assignments_composite 
  ON lane_assignments(game_id, member_id);