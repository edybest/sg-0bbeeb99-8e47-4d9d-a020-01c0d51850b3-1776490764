-- Add Men vs Women feature columns to games table
ALTER TABLE games
ADD COLUMN men_vs_women_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN women_handicap INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN games.men_vs_women_enabled IS 'Enable Men vs Women team competition for this game';
COMMENT ON COLUMN games.women_handicap IS 'Handicap points per woman player (e.g., 10 = +10 per woman)';