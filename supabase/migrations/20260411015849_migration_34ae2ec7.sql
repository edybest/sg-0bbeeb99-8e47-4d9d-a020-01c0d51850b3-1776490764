-- Fix page_access_control: Split ALL into separate policies
DROP POLICY IF EXISTS "Admin full access to page_access_control" ON page_access_control;

CREATE POLICY "Admins can insert page_access_control" ON page_access_control
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update page_access_control" ON page_access_control
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete page_access_control" ON page_access_control
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view page access settings" as the only SELECT policy