-- Fix lane_configurations: Split ALL into separate policies
DROP POLICY IF EXISTS "Admin full access to lane_configurations" ON lane_configurations;

CREATE POLICY "Admins can insert lane_configurations" ON lane_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update lane_configurations" ON lane_configurations
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete lane_configurations" ON lane_configurations
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view lane_configurations" as the only SELECT policy