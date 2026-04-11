-- Fix couples
DROP POLICY IF EXISTS "Admins can delete couples" ON couples;
DROP POLICY IF EXISTS "Admins can insert couples" ON couples;
DROP POLICY IF EXISTS "Admins can update couples" ON couples;

CREATE POLICY "Admins can delete couples" ON couples
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert couples" ON couples
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update couples" ON couples
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());