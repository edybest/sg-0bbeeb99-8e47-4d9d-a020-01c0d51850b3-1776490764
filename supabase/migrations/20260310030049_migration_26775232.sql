-- Fix training_scores RLS
DROP POLICY IF EXISTS "Anyone can view training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can manage own training scores" ON training_scores;
DROP POLICY IF EXISTS "Admin full access to training_scores" ON training_scores;

CREATE POLICY "Anyone can view training scores"
  ON training_scores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can manage own scores"
  ON training_scores
  FOR ALL
  TO public
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to training_scores"
  ON training_scores
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());