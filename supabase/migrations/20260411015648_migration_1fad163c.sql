-- Fix gallery_permissions: Split ALL into separate policies
DROP POLICY IF EXISTS "Only admins can manage permissions" ON gallery_permissions;

CREATE POLICY "Admins can insert gallery_permissions" ON gallery_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update gallery_permissions" ON gallery_permissions
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete gallery_permissions" ON gallery_permissions
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view permissions" as the only SELECT policy