-- Fix lane_configurations RLS
DROP POLICY IF EXISTS "Admin full access to lane_configurations" ON lane_configurations;
DROP POLICY IF EXISTS "Anyone can view lane_configurations" ON lane_configurations;

CREATE POLICY "Anyone can view lane_configurations"
  ON lane_configurations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to lane_configurations"
  ON lane_configurations
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());