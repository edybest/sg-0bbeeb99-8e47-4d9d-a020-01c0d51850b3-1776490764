-- Add clean_game column to game_players table
ALTER TABLE game_players 
ADD COLUMN IF NOT EXISTS clean_game BOOLEAN DEFAULT false;

-- Add clean_game_winners column to games table to store clean game data
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS clean_game_data JSONB DEFAULT '{"game1": [], "game2": [], "game3": [], "game4": [], "game5": []}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN game_players.clean_game IS 'Indicates if player achieved clean game (no gutter)';
COMMENT ON COLUMN games.clean_game_data IS 'Stores clean game winners for each game: {game1: [member_ids], game2: [member_ids], ...}';