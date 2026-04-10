-- SECURITY FIX 8: Fix increment_game_player_reaction and submit_player_reaction

DROP FUNCTION IF EXISTS increment_game_player_reaction(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS submit_player_reaction(uuid, text) CASCADE;

-- Recreate with search_path protection
CREATE OR REPLACE FUNCTION increment_game_player_reaction(
  p_game_id uuid,
  p_reaction_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO player_reactions_log (game_id, player_id, reaction_type)
  VALUES (p_game_id, auth.uid(), p_reaction_type);
END;
$$;

CREATE OR REPLACE FUNCTION submit_player_reaction(
  p_game_id uuid,
  p_reaction_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Insert the reaction
  INSERT INTO player_reactions_log (game_id, player_id, reaction_type)
  VALUES (p_game_id, auth.uid(), p_reaction_type);
  
  -- Return success
  SELECT json_build_object(
    'success', true,
    'message', 'Reaction submitted successfully'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_game_player_reaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_player_reaction(uuid, text) TO authenticated;