-- Fix couple_scores
DROP POLICY IF EXISTS "Admins can delete couple_scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can insert couple_scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can update couple_scores" ON couple_scores;

CREATE POLICY "Admins can delete couple_scores" ON couple_scores
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert couple_scores" ON couple_scores
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update couple_scores" ON couple_scores
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());