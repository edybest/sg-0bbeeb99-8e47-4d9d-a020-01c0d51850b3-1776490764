-- Recreate function WITH p_game_id parameter (matching frontend call)
DROP FUNCTION IF EXISTS add_player_reaction(uuid, uuid);
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
  v_current_likes_count INTEGER;
BEGIN
  -- Check how many DIFFERENT players this member has already liked in this game
  SELECT COUNT(DISTINCT gp.id)
  INTO v_current_likes_count
  FROM player_reactions_log prl
  JOIN game_players gp ON gp.id = prl.game_player_id
  WHERE prl.member_id = p_member_id
    AND gp.game_id = p_game_id
    AND prl.reaction_type = 'like';

  -- If already liked 5 different players in this game, reject
  IF v_current_likes_count >= 5 THEN
    RAISE EXCEPTION '5 likes limit reached for this game';
  END IF;

  -- Check if already liked this specific player in this game
  IF EXISTS (
    SELECT 1 
    FROM player_reactions_log 
    WHERE game_player_id = p_player_id 
      AND member_id = p_member_id
      AND reaction_type = 'like'
  ) THEN
    RAISE EXCEPTION 'Already liked this player';
  END IF;

  -- Insert the reaction
  INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
  VALUES (p_player_id, p_member_id, 'like');

  -- Increment likes_count in game_players
  UPDATE game_players 
  SET likes_count = COALESCE(likes_count, 0) + 1 
  WHERE id = p_player_id;

  RETURN TRUE;
END;
$$;