-- Drop and recreate function with correct column names
DROP FUNCTION IF EXISTS add_player_reaction(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.add_player_reaction(
  p_player_id UUID,
  p_game_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_likes_count INT;
BEGIN
  -- Check if member already liked 5 players in this game
  SELECT COUNT(DISTINCT target_player_id)
  INTO v_likes_count
  FROM player_reactions_log
  WHERE member_id = p_member_id 
    AND game_id = p_game_id
    AND reaction_type = 'like';

  IF v_likes_count >= 5 THEN
    RAISE EXCEPTION '5 likes limit reached for this game';
  END IF;

  -- Check if already liked this specific player today in this game
  IF EXISTS (
    SELECT 1 FROM player_reactions_log
    WHERE member_id = p_member_id 
      AND target_player_id = p_player_id
      AND game_id = p_game_id
      AND reaction_type = 'like'
      AND created_at::date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Daily limit reached - You already liked this player today';
  END IF;

  -- Insert the reaction
  INSERT INTO player_reactions_log (member_id, target_player_id, game_id, reaction_type)
  VALUES (p_member_id, p_player_id, p_game_id, 'like');

  -- Update the likes counter on the player
  UPDATE players 
  SET likes_count = COALESCE(likes_count, 0) + 1 
  WHERE id = p_player_id;

  RETURN TRUE;
END;
$$;