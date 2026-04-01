-- Drop old versions and create fresh RPC
DROP FUNCTION IF EXISTS add_player_reaction(uuid, text, uuid);

CREATE OR REPLACE FUNCTION add_player_reaction(
  p_player_id uuid,
  p_type text,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_count integer;
BEGIN
  -- Check if user already reacted today
  SELECT COUNT(*) INTO v_log_count
  FROM player_reactions_log
  WHERE game_player_id = p_player_id
    AND member_id = p_member_id
    AND DATE(created_at) = CURRENT_DATE;

  IF v_log_count > 0 THEN
    RAISE EXCEPTION 'Daily limit reached' USING ERRCODE = 'P0001';
  END IF;

  -- Insert reaction log
  INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
  VALUES (p_player_id, p_member_id, p_type);

  -- Update counter
  IF p_type = 'like' THEN
    UPDATE game_players 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = p_player_id;
  ELSE
    UPDATE game_players 
    SET loves_count = COALESCE(loves_count, 0) + 1 
    WHERE id = p_player_id;
  END IF;

  RETURN TRUE;
END;
$$;