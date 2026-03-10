-- Update games table RLS to use unified auth
DROP POLICY IF EXISTS "Anyone can view games" ON games;
DROP POLICY IF EXISTS "Admin full access to games" ON games;

CREATE POLICY "Anyone can view games"
  ON games
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to games"
  ON games
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());