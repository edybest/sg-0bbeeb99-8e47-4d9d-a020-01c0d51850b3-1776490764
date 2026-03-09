-- Update game_players RLS policies
DROP POLICY IF EXISTS "Players can view all game records" ON game_players;
DROP POLICY IF EXISTS "Players can insert their own records" ON game_players;
DROP POLICY IF EXISTS "Players can update their own records" ON game_players;
DROP POLICY IF EXISTS "Players can delete their own records" ON game_players;
DROP POLICY IF EXISTS "Admin can do everything on game_players" ON game_players;

-- New optimized policies using get_current_member_id()
CREATE POLICY "Anyone can view game_players"
  ON game_players FOR SELECT
  USING (true);

CREATE POLICY "Members can manage their own game records"
  ON game_players FOR ALL
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to game_players"
  ON game_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );