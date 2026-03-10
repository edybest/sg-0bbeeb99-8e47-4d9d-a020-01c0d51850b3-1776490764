-- Fix lane_assignments RLS
DROP POLICY IF EXISTS "Admin full access to lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Anyone can view lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Members can manage their own lane assignments" ON lane_assignments;

CREATE POLICY "Anyone can view lane_assignments"
  ON lane_assignments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can manage own assignments"
  ON lane_assignments
  FOR ALL
  TO public
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to lane_assignments"
  ON lane_assignments
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());