CREATE TABLE IF NOT EXISTS player_reactions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
    member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT CHECK (reaction_type IN ('like', 'love')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_reactions_log_lookup ON player_reactions_log(game_player_id, member_id, created_at);

CREATE OR REPLACE FUNCTION add_player_reaction(p_game_player_id UUID, p_member_id UUID, p_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- Semak jika pengguna ini telah memberikan apa-apa reaksi kepada pemain ini pada hari ini
    SELECT id INTO v_existing_id
    FROM player_reactions_log
    WHERE game_player_id = p_game_player_id
      AND member_id = p_member_id
      AND created_at::date = CURRENT_DATE
    LIMIT 1;

    -- Jika sudah wujud rekod untuk hari ini, sekat transaksi
    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_REACTED_TODAY';
    END IF;

    -- Masukkan rekod baharu ke dalam log
    INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
    VALUES (p_game_player_id, p_member_id, p_type);

    -- Tambah jumlah kiraan pada jadual utama
    IF p_type = 'like' THEN
        UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_game_player_id;
    ELSIF p_type = 'love' THEN
        UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_game_player_id;
    END IF;
END;
$$;