-- SECURITY FIX 5: Recreate game and player management functions with search_path - Batch 2

CREATE OR REPLACE FUNCTION add_player_reaction(
  p_game_id uuid,
  p_player_id uuid,
  p_type text,
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO player_reactions_log (game_id, player_id, reaction_type, reacted_by)
  VALUES (p_game_id, p_player_id, p_type, p_member_id);
  
  UPDATE game_players
  SET 
    fire_count = CASE WHEN p_type = 'fire' THEN COALESCE(fire_count, 0) + 1 ELSE fire_count END,
    ice_count = CASE WHEN p_type = 'ice' THEN COALESCE(ice_count, 0) + 1 ELSE ice_count END,
    poop_count = CASE WHEN p_type = 'poop' THEN COALESCE(poop_count, 0) + 1 ELSE poop_count END,
    clown_count = CASE WHEN p_type = 'clown' THEN COALESCE(clown_count, 0) + 1 ELSE clown_count END
  WHERE game_id = p_game_id AND player_id = p_player_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_game_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_player_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE games SET updated_at = NOW() WHERE id = NEW.game_id;
  RETURN NEW;
END;
$$;

-- Recreate triggers for game management
CREATE TRIGGER set_game_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_game_updated_at();

CREATE TRIGGER update_game_on_player_change
  AFTER INSERT OR UPDATE OR DELETE ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_player_updated_at();