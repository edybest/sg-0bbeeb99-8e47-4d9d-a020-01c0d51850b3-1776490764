CREATE TABLE IF NOT EXISTS player_reactions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    reaction_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION add_player_reaction(p_player_id UUID, p_type TEXT, p_member_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
    already_reacted BOOLEAN;
BEGIN
    -- Check if reaction exists today for this specific player by this member
    SELECT EXISTS (
        SELECT 1 FROM player_reactions_log
        WHERE game_player_id = p_player_id
        AND member_id = p_member_id
        AND created_at >= today_start
    ) INTO already_reacted;

    IF already_reacted THEN
        RAISE EXCEPTION 'Daily limit reached';
    END IF;

    -- Insert log
    INSERT INTO player_reactions_log (game_player_id, member_id, reaction_type)
    VALUES (p_player_id, p_member_id, p_type);

    -- Update count
    IF p_type = 'like' THEN
        UPDATE game_players SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = p_player_id;
    ELSIF p_type = 'love' THEN
        UPDATE game_players SET loves_count = COALESCE(loves_count, 0) + 1 WHERE id = p_player_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;