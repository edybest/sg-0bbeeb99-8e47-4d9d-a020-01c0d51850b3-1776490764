-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all members" ON members;

-- Create correct admin policy using is_admin() function (no recursion)
CREATE POLICY "Admins can manage all members" ON members
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));