-- Fix the infinite recursion in members table policy
DROP POLICY IF EXISTS "Admins can manage members" ON members;

CREATE POLICY "Admins can manage members" ON members
  FOR ALL
  TO authenticated
  USING (is_current_user_admin());