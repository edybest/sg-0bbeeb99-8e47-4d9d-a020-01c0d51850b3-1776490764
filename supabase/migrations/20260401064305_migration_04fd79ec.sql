-- Pastikan jadual pembalakan wujud
CREATE TABLE IF NOT EXISTS player_reactions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    reaction_type TEXT,
    reaction_date DATE DEFAULT current_date,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(player_id, member_id, reaction_date)
);

-- Cipta semula fungsi dengan nama parameter yang tepat seperti dalam kod UI
CREATE OR REPLACE FUNCTION add_player_reaction(p_player_id UUID, p_type TEXT, p_member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := current_date;
BEGIN
    -- Semak had harian
    IF EXISTS (
        SELECT 1 FROM player_reactions_log 
        WHERE player_id = p_player_id 
          AND member_id = p_member_id 
          AND reaction_date = v_today
    ) THEN
        RAISE EXCEPTION 'Daily limit reached';
    END IF;

    -- Simpan rekod reaksi baru
    INSERT INTO player_reactions_log (player_id, member_id, reaction_type, reaction_date)
    VALUES (p_player_id, p_member_id, p_type, v_today);

    -- Tambah kiraan pada jadual game_players
    IF p_type = 'like' THEN
        UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_player_id;
    ELSIF p_type = 'love' THEN
        UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_player_id;
    END IF;

    RETURN TRUE;
END;
$$;