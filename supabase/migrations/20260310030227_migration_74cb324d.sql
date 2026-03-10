-- Fix fivefive_games RLS
DROP POLICY IF EXISTS "Admin full access to fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "Anyone can view fivefive_games" ON fivefive_games;

CREATE POLICY "Anyone can view fivefive_games"
  ON fivefive_games
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to fivefive_games"
  ON fivefive_games
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());