-- Fix couples: Remove duplicate ALL policy
DROP POLICY IF EXISTS "consolidated_manage_couples" ON couples;

-- Create separate INSERT/UPDATE/DELETE policies
CREATE POLICY "Admins can insert couples" ON couples
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can update couples" ON couples
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can delete couples" ON couples
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- Keep "public_read_couples" as the only SELECT policy