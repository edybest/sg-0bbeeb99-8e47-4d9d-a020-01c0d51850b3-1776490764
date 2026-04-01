-- Drop old function and create new one with 5 likes limit per game
DROP FUNCTION IF EXISTS add_player_reaction(uuid, text, uuid);

CREATE OR REPLACE FUNCTION add_player_reaction(
  p_player_id UUID,
  p_member_id UUID,
  p_game_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Check if user already liked this player today
  IF EXISTS (
    SELECT 1 FROM player_reactions_log
    WHERE member_id = p_member_id 
      AND player_id = p_player_id
      AND created_at::date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Daily limit reached' USING ERRCODE = 'P0001';
  END IF;

  -- Check if user has already liked 5 players in this game
  SELECT COUNT(DISTINCT player_id) INTO v_existing_count
  FROM player_reactions_log
  WHERE member_id = p_member_id 
    AND game_id = p_game_id
    AND created_at::date = CURRENT_DATE;
  
  IF v_existing_count >= 5 THEN
    RAISE EXCEPTION 'You can only like 5 players per game' USING ERRCODE = 'P0002';
  END IF;

  -- Insert the reaction
  INSERT INTO player_reactions_log (player_id, member_id, game_id)
  VALUES (p_player_id, p_member_id, p_game_id);

  -- Update likes count
  UPDATE game_players 
  SET likes_count = COALESCE(likes_count, 0) + 1 
  WHERE id = p_player_id;

  RETURN TRUE;
END;
$$;