-- SECURITY FIX 9: Fix submit_player_reaction with search_path
DROP FUNCTION IF EXISTS submit_player_reaction(uuid, uuid, text);

CREATE OR REPLACE FUNCTION submit_player_reaction(
  p_target_player_id uuid, 
  p_user_id uuid, 
  p_reaction_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
    already_reacted BOOLEAN;
BEGIN
    -- Check if user already reacted to this player today
    SELECT EXISTS (
        SELECT 1 FROM player_reactions_log
        WHERE game_player_id = p_target_player_id
        AND member_id = p_user_id
        AND created_at >= today_start
    ) INTO already_reacted;

    IF already_reacted THEN
        RAISE EXCEPTION 'Daily limit reached';
    END IF;

    -- Insert new reaction log
    INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
    VALUES (p_target_player_id, p_user_id, p_reaction_type);

    -- Increment reaction count
    IF p_reaction_type = 'like' THEN
        UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_target_player_id;
    ELSIF p_reaction_type = 'love' THEN
        UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_target_player_id;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_player_reaction(uuid, uuid, text) TO authenticated;