-- Fix mini_blok: Remove ALL policy for admins, keep only non-SELECT operations
DROP POLICY IF EXISTS "Admins can manage all mini bloks" ON mini_blok;

CREATE POLICY "Admins can insert mini_blok" ON mini_blok
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can update mini_blok" ON mini_blok
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can delete mini_blok" ON mini_blok
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- Keep "Anyone can view mini blok entries" as the only SELECT policy
-- Keep "owner_collab_update_mini_blok" for UPDATE