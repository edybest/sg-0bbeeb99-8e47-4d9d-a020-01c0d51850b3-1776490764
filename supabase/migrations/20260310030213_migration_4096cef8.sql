-- Fix club_settings RLS
DROP POLICY IF EXISTS "Admin full access to club_settings" ON club_settings;
DROP POLICY IF EXISTS "Anyone can view club_settings" ON club_settings;

CREATE POLICY "Anyone can view club_settings"
  ON club_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to club_settings"
  ON club_settings
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());