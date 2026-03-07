-- Add score columns to fivefive_participants
ALTER TABLE fivefive_participants
ADD COLUMN IF NOT EXISTS game1_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game2_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game3_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game4_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game5_score INTEGER DEFAULT 0;

COMMENT ON COLUMN fivefive_participants.game1_score IS 'Score for game 1 in FiveFive';
COMMENT ON COLUMN fivefive_participants.game2_score IS 'Score for game 2 in FiveFive';
COMMENT ON COLUMN fivefive_participants.game3_score IS 'Score for game 3 in FiveFive';
COMMENT ON COLUMN fivefive_participants.game4_score IS 'Score for game 4 in FiveFive';
COMMENT ON COLUMN fivefive_participants.game5_score IS 'Score for game 5 in FiveFive';