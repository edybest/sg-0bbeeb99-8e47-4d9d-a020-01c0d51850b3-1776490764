-- FIX CRITICAL SECURITY ISSUE: Members should ONLY update their own profile
DROP POLICY IF EXISTS "Members can update own profile" ON members;

CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO public
  USING (id = get_current_member_id())
  WITH CHECK (id = get_current_member_id());