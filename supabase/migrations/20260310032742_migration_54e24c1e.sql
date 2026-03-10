-- Update game_players table RLS to use unified auth
DROP POLICY IF EXISTS "Anyone can view game_players" ON game_players;
DROP POLICY IF EXISTS "Admin full access to game_players" ON game_players;
DROP POLICY IF EXISTS "Members can manage own records" ON game_players;

CREATE POLICY "Anyone can view game_players"
  ON game_players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to game_players"
  ON game_players
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Members can manage own game records"
  ON game_players
  FOR ALL
  TO public
  USING (member_id = get_current_member_id_unified())
  WITH CHECK (member_id = get_current_member_id_unified());