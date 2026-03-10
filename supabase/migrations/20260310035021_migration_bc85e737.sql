-- 7. Lane_assignments table
DROP POLICY IF EXISTS "Anyone can view lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Admin full access to lane_assignments" ON lane_assignments;

CREATE POLICY "Anyone can view lane_assignments"
  ON lane_assignments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to lane_assignments"
  ON lane_assignments
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 8. Lane_configurations table
DROP POLICY IF EXISTS "Anyone can view lane_configurations" ON lane_configurations;
DROP POLICY IF EXISTS "Admin full access to lane_configurations" ON lane_configurations;

CREATE POLICY "Anyone can view lane_configurations"
  ON lane_configurations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to lane_configurations"
  ON lane_configurations
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 9. Lane_spin_results table
DROP POLICY IF EXISTS "Anyone can view lane_spin_results" ON lane_spin_results;
DROP POLICY IF EXISTS "Admin full access to lane_spin_results" ON lane_spin_results;

CREATE POLICY "Anyone can view lane_spin_results"
  ON lane_spin_results
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to lane_spin_results"
  ON lane_spin_results
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());