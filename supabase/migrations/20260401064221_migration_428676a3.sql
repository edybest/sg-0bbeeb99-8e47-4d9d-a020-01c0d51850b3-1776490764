DROP FUNCTION IF EXISTS public.add_player_reaction(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.add_player_reaction(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.submit_player_reaction(p_target_player_id uuid, p_user_id uuid, p_reaction_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
    already_reacted BOOLEAN;
BEGIN
    -- Semak jika pengguna telah memberikan reaksi kepada pemain ini pada hari ini
    SELECT EXISTS (
        SELECT 1 FROM player_reactions_log
        WHERE game_player_id = p_target_player_id
        AND member_id = p_user_id
        AND created_at >= today_start
    ) INTO already_reacted;

    IF already_reacted THEN
        RAISE EXCEPTION 'Daily limit reached';
    END IF;

    -- Masukkan log baharu
    INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
    VALUES (p_target_player_id, p_user_id, p_reaction_type);

    -- Tambah jumlah kiraan
    IF p_reaction_type = 'like' THEN
        UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_target_player_id;
    ELSIF p_reaction_type = 'love' THEN
        UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_target_player_id;
    END IF;

    RETURN TRUE;
END;
$$;