-- Fix members: Split ALL into separate policies
DROP POLICY IF EXISTS "Admins can manage members" ON members;

CREATE POLICY "Admins can insert members" ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update members" ON members
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete members" ON members
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view members" as the only SELECT policy
-- Keep "Members can update own profile" for UPDATE