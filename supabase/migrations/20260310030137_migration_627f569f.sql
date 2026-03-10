-- Fix lane_spin_results RLS
DROP POLICY IF EXISTS "Admin full access to lane_spin_results" ON lane_spin_results;
DROP POLICY IF EXISTS "Anyone can view lane spins" ON lane_spin_results;
DROP POLICY IF EXISTS "Members can create own spins" ON lane_spin_results;

CREATE POLICY "Anyone can view lane spins"
  ON lane_spin_results
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can manage own spins"
  ON lane_spin_results
  FOR ALL
  TO public
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to lane_spin_results"
  ON lane_spin_results
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());