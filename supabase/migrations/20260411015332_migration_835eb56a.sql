-- Fix training_scores: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Admin full access to training_scores" ON training_scores;
DROP POLICY IF EXISTS "Members can view own training scores" ON training_scores;

-- Create non-SELECT admin policies only
CREATE POLICY "Admins can insert training_scores" ON training_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update training_scores" ON training_scores
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete training_scores" ON training_scores
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "view_training_scores" (public SELECT) as the ONLY SELECT policy
-- Application layer should filter what each member can see