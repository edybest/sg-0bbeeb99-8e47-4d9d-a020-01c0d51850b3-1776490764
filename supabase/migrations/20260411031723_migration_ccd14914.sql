-- Batch 3: gallery tables (albums and permissions only)
DROP POLICY IF EXISTS "Admins can delete gallery_albums" ON gallery_albums;
DROP POLICY IF EXISTS "Admins can update gallery_albums" ON gallery_albums;
DROP POLICY IF EXISTS "Admins can delete gallery_permissions" ON gallery_permissions;
DROP POLICY IF EXISTS "Admins can insert gallery_permissions" ON gallery_permissions;
DROP POLICY IF EXISTS "Admins can update gallery_permissions" ON gallery_permissions;

CREATE POLICY "Admins can delete gallery_albums" ON gallery_albums
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update gallery_albums" ON gallery_albums
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete gallery_permissions" ON gallery_permissions
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert gallery_permissions" ON gallery_permissions
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update gallery_permissions" ON gallery_permissions
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());