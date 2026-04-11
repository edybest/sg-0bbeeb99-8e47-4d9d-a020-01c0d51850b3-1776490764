-- Batch 16: Fix game_comments, games, lane_configurations
DROP POLICY IF EXISTS "Admins can delete game_comments" ON game_comments;
DROP POLICY IF EXISTS "Admins can update game_comments" ON game_comments;
DROP POLICY IF EXISTS "Admins can delete games" ON games;
DROP POLICY IF EXISTS "Admins can insert games" ON games;
DROP POLICY IF EXISTS "Admins can update games" ON games;
DROP POLICY IF EXISTS "Admins can delete lane_configurations" ON lane_configurations;
DROP POLICY IF EXISTS "Admins can insert lane_configurations" ON lane_configurations;
DROP POLICY IF EXISTS "Admins can update lane_configurations" ON lane_configurations;

CREATE POLICY "Admins can delete game_comments" ON game_comments
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update game_comments" ON game_comments
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete games" ON games
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert games" ON games
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update games" ON games
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete lane_configurations" ON lane_configurations
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert lane_configurations" ON lane_configurations
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update lane_configurations" ON lane_configurations
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());