-- CRITICAL PERFORMANCE FIX: Optimize remaining policies - Batch 5
-- game_viewers, lane_assignments, lane_spin_results, member_feedback, members

-- game_viewers
DROP POLICY IF EXISTS "members_manage_own_presence" ON game_viewers;
CREATE POLICY "members_manage_own_presence"
  ON game_viewers
  FOR ALL
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- lane_assignments
DROP POLICY IF EXISTS "manage_lane_assignments" ON lane_assignments;
CREATE POLICY "manage_lane_assignments"
  ON lane_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) 
      AND (m.is_admin = true OR member_id = m.id)
    )
  );

-- lane_spin_results
DROP POLICY IF EXISTS "Members can insert own lane spin results" ON lane_spin_results;
CREATE POLICY "Members can insert own lane spin results"
  ON lane_spin_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- member_feedback
DROP POLICY IF EXISTS "Members can submit feedback" ON member_feedback;
CREATE POLICY "Members can submit feedback"
  ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "view_feedback" ON member_feedback;
CREATE POLICY "view_feedback"
  ON member_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) 
      AND (m.is_admin = true OR member_id = m.id)
    )
  );

-- members
DROP POLICY IF EXISTS "Members can update own profile" ON members;
CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));