-- Padam semua versi lama
DROP FUNCTION IF EXISTS add_player_reaction(uuid, text, uuid);
DROP FUNCTION IF EXISTS add_player_reaction(p_target_player_id uuid, p_reaction_type text, p_member_id uuid);
DROP FUNCTION IF EXISTS add_player_reaction(p_player_id uuid, p_type text, p_member_id uuid);

-- Bina fungsi baharu dengan nama parameter yang BETUL
CREATE OR REPLACE FUNCTION add_player_reaction(
    p_player_id UUID,
    p_type TEXT,
    p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_reaction_count INT;
BEGIN
    -- Semak had harian
    SELECT COUNT(*) INTO existing_reaction_count
    FROM player_reactions_log
    WHERE game_player_id = p_player_id
      AND member_id = p_member_id
      AND DATE(created_at) = CURRENT_DATE;

    IF existing_reaction_count > 0 THEN
        RAISE EXCEPTION 'Daily limit reached' USING ERRCODE = 'P0001';
    END IF;

    -- Masukkan log
    INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
    VALUES (p_player_id, p_member_id, p_type);

    -- Tambah kiraan
    IF p_type = 'like' THEN
        UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_player_id;
    ELSIF p_type = 'love' THEN
        UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_player_id;
    END IF;

    RETURN TRUE;
END;
$$;