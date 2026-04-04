-- Step 1: Drop foreign key constraint on couples.game_id
ALTER TABLE couples DROP CONSTRAINT IF EXISTS couples_game_id_fkey;

-- Step 2: Drop unique constraint that includes game_id
ALTER TABLE couples DROP CONSTRAINT IF EXISTS couples_game_id_player1_id_player2_id_key;

-- Step 3: Remove game_id column from couples (couples are now global/reusable)
ALTER TABLE couples DROP COLUMN IF EXISTS game_id;

-- Step 4: Add unique constraint on player combination (prevent duplicate couples with same players)
ALTER TABLE couples ADD CONSTRAINT couples_player1_id_player2_id_key UNIQUE (player1_id, player2_id);

-- Step 5: Add game_id to couple_scores (track scores per game)
ALTER TABLE couple_scores ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE CASCADE;

-- Step 6: Drop old unique constraint on couple_scores
ALTER TABLE couple_scores DROP CONSTRAINT IF EXISTS couple_scores_couple_id_key;

-- Step 7: Add new unique constraint on (couple_id, game_id) - one score record per couple per game
ALTER TABLE couple_scores ADD CONSTRAINT couple_scores_couple_id_game_id_key UNIQUE (couple_id, game_id);

-- Step 8: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_couple_scores_game_id ON couple_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_couple_scores_couple_game ON couple_scores(couple_id, game_id);

COMMENT ON TABLE couples IS 'Global couple/team definitions - reusable across multiple games';
COMMENT ON TABLE couple_scores IS 'Couple scores per game - tracks couple performance in each game';