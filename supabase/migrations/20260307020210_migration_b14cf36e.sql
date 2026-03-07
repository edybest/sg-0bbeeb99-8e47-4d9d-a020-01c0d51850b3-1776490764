-- Add fivefive_participant column to game_players table
ALTER TABLE game_players
ADD COLUMN IF NOT EXISTS is_fivefive BOOLEAN DEFAULT false;

COMMENT ON COLUMN game_players.is_fivefive IS 'Whether this player participates in FiveFive game';