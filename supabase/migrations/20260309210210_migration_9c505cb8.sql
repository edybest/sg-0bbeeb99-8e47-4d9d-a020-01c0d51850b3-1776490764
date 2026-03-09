-- Update lane_assignments RLS policies
DROP POLICY IF EXISTS "Anyone can view lane assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Members can manage their own lane assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Admin can do everything on lane_assignments" ON lane_assignments;

-- New optimized policies
CREATE POLICY "Anyone can view lane_assignments"
  ON lane_assignments FOR SELECT
  USING (true);

CREATE POLICY "Members can manage their own lane assignments"
  ON lane_assignments FOR ALL
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to lane_assignments"
  ON lane_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );