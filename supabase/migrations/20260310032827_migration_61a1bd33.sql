-- Update fivefive tables
DROP POLICY IF EXISTS "Admin full access to fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Admin full access to fivefive_games" ON fivefive_games;

CREATE POLICY "Admin full access to fivefive_participants"
  ON fivefive_participants
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin full access to fivefive_games"
  ON fivefive_games
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());