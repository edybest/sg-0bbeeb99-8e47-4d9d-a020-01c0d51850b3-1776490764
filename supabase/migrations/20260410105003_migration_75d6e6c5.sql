-- PERFORMANCE FIX 4: Consolidate multiple permissive policies - lane_assignments
-- Currently has 1 ALL + 1 INSERT + 1 UPDATE policy, consolidate into 1

DROP POLICY IF EXISTS "Admin full access to lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Members can insert their own lane assignment" ON lane_assignments;
DROP POLICY IF EXISTS "Members can update their own lane assignment" ON lane_assignments;

CREATE POLICY "manage_lane_assignments" 
  ON lane_assignments 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = auth.uid() 
      AND (m.is_admin = true OR member_id = m.id)
    )
  );