-- Fix lane_spin_results RLS policies
DROP POLICY IF EXISTS "Admins can manage all spin results" ON lane_spin_results;
DROP POLICY IF EXISTS "Anyone can view lane spin results" ON lane_spin_results;
DROP POLICY IF EXISTS "Members can insert own spin results" ON lane_spin_results;

CREATE POLICY "Admin full access to lane_spin_results"
  ON lane_spin_results
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view lane_spin_results"
  ON lane_spin_results
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can insert own spin results"
  ON lane_spin_results
  FOR INSERT
  TO public
  WITH CHECK (member_id = get_current_member_id());