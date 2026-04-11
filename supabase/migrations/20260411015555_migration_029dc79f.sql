-- Fix club_settings: Split ALL into separate policies
DROP POLICY IF EXISTS "Admin full access to club_settings" ON club_settings;

CREATE POLICY "Admins can insert club_settings" ON club_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update club_settings" ON club_settings
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete club_settings" ON club_settings
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view club_settings" as the only SELECT policy