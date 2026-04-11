-- Fix lane_spin_results: Split ALL into separate policies
DROP POLICY IF EXISTS "Admin full access to lane_spin_results" ON lane_spin_results;

CREATE POLICY "Admins can insert lane_spin_results" ON lane_spin_results
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update lane_spin_results" ON lane_spin_results
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete lane_spin_results" ON lane_spin_results
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "public_read_lane_spins" as the only SELECT policy