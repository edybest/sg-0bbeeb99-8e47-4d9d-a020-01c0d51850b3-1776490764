-- Fix training_scores RLS policies - currently still using auth.uid()
DROP POLICY IF EXISTS "Admins can manage all training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can manage their own training scores" ON training_scores;

-- Create new policies using get_current_member_id()
CREATE POLICY "Admin full access to training_scores"
  ON training_scores
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );

CREATE POLICY "Members can view all training scores"
  ON training_scores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can manage their own training scores"
  ON training_scores
  FOR ALL
  TO public
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());