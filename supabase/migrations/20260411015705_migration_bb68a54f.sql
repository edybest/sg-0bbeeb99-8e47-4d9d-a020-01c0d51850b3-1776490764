-- Fix games: Split ALL into separate policies
DROP POLICY IF EXISTS "Admin full access to games" ON games;

CREATE POLICY "Admins can insert games" ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update games" ON games
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete games" ON games
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view games" as the only SELECT policy