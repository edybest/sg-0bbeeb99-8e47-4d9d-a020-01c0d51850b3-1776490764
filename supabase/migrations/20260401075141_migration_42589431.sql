-- Drop and recreate function with 100% correct column names
DROP FUNCTION IF EXISTS add_player_reaction(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION add_player_reaction(
  p_player_id UUID,
  p_game_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if member has already liked 5 different players in this game
  SELECT COUNT(DISTINCT game_player_id)
  INTO v_count
  FROM player_reactions_log
  WHERE member_id = p_member_id
    AND game_id = p_game_id
    AND reaction_type = 'like';

  IF v_count >= 5 THEN
    -- Check if they already liked THIS specific player
    IF NOT EXISTS (
      SELECT 1 FROM player_reactions_log
      WHERE member_id = p_member_id
        AND game_id = p_game_id
        AND game_player_id = p_player_id
        AND reaction_type = 'like'
    ) THEN
      RAISE EXCEPTION '5 likes limit reached for this game';
    END IF;
  END IF;

  -- Insert or update reaction (upsert pattern)
  INSERT INTO player_reactions_log (game_player_id, member_id, game_id, reaction_type)
  VALUES (p_player_id, p_member_id, p_game_id, 'like')
  ON CONFLICT (game_player_id, member_id, game_id) 
  DO UPDATE SET 
    reaction_type = 'like',
    created_at = NOW();

  -- Update likes counter in game_players table
  UPDATE game_players
  SET likes_count = COALESCE(likes_count, 0) + 1 
  WHERE id = p_player_id;

  RETURN TRUE;
END;
$$;