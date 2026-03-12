-- Setup RLS Policies for member_feedback
CREATE POLICY "Admin can view all feedback"
  ON member_feedback
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admin can update feedback"
  ON member_feedback
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Members can submit feedback"
  ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view own feedback"
  ON member_feedback
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );