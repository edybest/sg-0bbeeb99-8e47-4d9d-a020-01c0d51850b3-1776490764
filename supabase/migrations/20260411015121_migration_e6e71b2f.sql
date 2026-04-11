-- Fix couple_scores: Split ALL policy into INSERT/UPDATE/DELETE only
DROP POLICY IF EXISTS "Admins can manage couple scores" ON couple_scores;

CREATE POLICY "Admins can insert couple scores" ON couple_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can update couple scores" ON couple_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can delete couple scores" ON couple_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- Keep public_read_couple_scores as the only SELECT policy