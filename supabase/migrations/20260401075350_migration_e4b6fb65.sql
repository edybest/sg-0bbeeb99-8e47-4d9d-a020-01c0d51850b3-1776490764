-- Recreate function WITHOUT game_id (store only game_player_id and member_id)
DROP FUNCTION IF EXISTS add_player_reaction(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS add_player_reaction(uuid, uuid);

CREATE OR REPLACE FUNCTION add_player_reaction(
  p_player_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_game_id UUID;
BEGIN
  -- Get the game_id from game_players table
  SELECT game_id INTO v_game_id
  FROM game_players
  WHERE id = p_player_id;

  -- Check if member has already liked 5 different players in this game
  SELECT COUNT(DISTINCT game_player_id) INTO v_count
  FROM player_reactions_log prl
  JOIN game_players gp ON gp.id = prl.game_player_id
  WHERE prl.member_id = p_member_id
    AND gp.game_id = v_game_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION '5 likes limit reached for this game';
  END IF;

  -- Check if member already liked this specific player today
  SELECT COUNT(*) INTO v_count
  FROM player_reactions_log
  WHERE game_player_id = p_player_id
    AND member_id = p_member_id
    AND DATE(created_at) = CURRENT_DATE;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Daily limit reached for this player';
  END IF;

  -- Insert reaction log
  INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
  VALUES (p_player_id, p_member_id, 'like');

  -- Update likes counter
  UPDATE game_players 
  SET likes_count = COALESCE(likes_count, 0) + 1 
  WHERE id = p_player_id;

  RETURN TRUE;
END;
$$;