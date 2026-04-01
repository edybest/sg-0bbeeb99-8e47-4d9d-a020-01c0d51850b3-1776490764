ALTER TABLE game_players ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS loves_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_game_player_reaction(p_id UUID, p_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_type = 'like' THEN
    UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_id;
  ELSIF p_type = 'love' THEN
    UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_id;
  END IF;
END;
$$;