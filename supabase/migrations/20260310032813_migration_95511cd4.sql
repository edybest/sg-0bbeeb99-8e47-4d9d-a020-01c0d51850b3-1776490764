-- Update remaining admin-only tables
DROP POLICY IF EXISTS "Admin full access to training_scores" ON training_scores;
DROP POLICY IF EXISTS "Anyone can view training scores" ON training_scores;

CREATE POLICY "Anyone can view training scores"
  ON training_scores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to training_scores"
  ON training_scores
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());