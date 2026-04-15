-- Add exclude_from_men_vs_women column to game_players table
ALTER TABLE game_players
ADD COLUMN exclude_from_men_vs_women BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN game_players.exclude_from_men_vs_women IS 'TRUE if player is excluded from Men vs Women competition';