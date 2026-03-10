-- Update lane tables
DROP POLICY IF EXISTS "Admin full access to lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Admin full access to lane_configurations" ON lane_configurations;
DROP POLICY IF EXISTS "Admin full access to lane_spin_results" ON lane_spin_results;

CREATE POLICY "Admin full access to lane_assignments"
  ON lane_assignments
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin full access to lane_configurations"
  ON lane_configurations
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin full access to lane_spin_results"
  ON lane_spin_results
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());