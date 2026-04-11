-- Batch 17: Fix lane_spin_results, member_sessions, members, page_access_control, training_scores
DROP POLICY IF EXISTS "Admins can delete lane_spin_results" ON lane_spin_results;
DROP POLICY IF EXISTS "Admins can insert lane_spin_results" ON lane_spin_results;
DROP POLICY IF EXISTS "Admins can update lane_spin_results" ON lane_spin_results;
DROP POLICY IF EXISTS "Admins can delete member_sessions" ON member_sessions;
DROP POLICY IF EXISTS "Admins can insert member_sessions" ON member_sessions;
DROP POLICY IF EXISTS "Admins can update member_sessions" ON member_sessions;
DROP POLICY IF EXISTS "Admins can delete members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can delete page_access_control" ON page_access_control;
DROP POLICY IF EXISTS "Admins can insert page_access_control" ON page_access_control;
DROP POLICY IF EXISTS "Admins can update page_access_control" ON page_access_control;
DROP POLICY IF EXISTS "Admins can delete training_scores" ON training_scores;
DROP POLICY IF EXISTS "Admins can insert training_scores" ON training_scores;
DROP POLICY IF EXISTS "Admins can update training_scores" ON training_scores;

CREATE POLICY "Admins can delete lane_spin_results" ON lane_spin_results
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert lane_spin_results" ON lane_spin_results
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update lane_spin_results" ON lane_spin_results
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete member_sessions" ON member_sessions
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert member_sessions" ON member_sessions
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update member_sessions" ON member_sessions
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete members" ON members
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert members" ON members
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete page_access_control" ON page_access_control
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert page_access_control" ON page_access_control
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update page_access_control" ON page_access_control
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete training_scores" ON training_scores
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert training_scores" ON training_scores
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update training_scores" ON training_scores
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());