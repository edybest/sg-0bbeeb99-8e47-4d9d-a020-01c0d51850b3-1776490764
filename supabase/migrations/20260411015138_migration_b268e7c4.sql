-- Fix fivefive_games: Remove duplicate ALL policy
DROP POLICY IF EXISTS "consolidated_manage_fivefive_games" ON fivefive_games;

-- Split "Admin full access to fivefive_games" into INSERT/UPDATE/DELETE only
DROP POLICY IF EXISTS "Admin full access to fivefive_games" ON fivefive_games;

CREATE POLICY "Admins can insert fivefive_games" ON fivefive_games
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update fivefive_games" ON fivefive_games
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete fivefive_games" ON fivefive_games
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view fivefive_games" as the only SELECT policy