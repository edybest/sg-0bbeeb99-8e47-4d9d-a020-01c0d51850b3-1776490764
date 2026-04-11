-- Fix lane_assignments, mini_blok_players, nav_layout_settings, notification_recipients, player_reactions_log
DROP POLICY IF EXISTS "Admins can delete lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Admins can insert lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Admins can update lane_assignments" ON lane_assignments;
DROP POLICY IF EXISTS "Admins can delete mini_blok_players" ON mini_blok_players;
DROP POLICY IF EXISTS "Admins can insert mini_blok_players" ON mini_blok_players;
DROP POLICY IF EXISTS "Admins can update mini_blok_players" ON mini_blok_players;
DROP POLICY IF EXISTS "Admins can delete nav_layout_settings" ON nav_layout_settings;
DROP POLICY IF EXISTS "Admins can insert nav_layout_settings" ON nav_layout_settings;
DROP POLICY IF EXISTS "Admins can update nav_layout_settings" ON nav_layout_settings;
DROP POLICY IF EXISTS "Admins can delete notification_recipients" ON notification_recipients;
DROP POLICY IF EXISTS "Admins can update notification_recipients" ON notification_recipients;
DROP POLICY IF EXISTS "Admins can delete player_reactions_log" ON player_reactions_log;
DROP POLICY IF EXISTS "Admins can insert player_reactions_log" ON player_reactions_log;
DROP POLICY IF EXISTS "Admins can update player_reactions_log" ON player_reactions_log;

CREATE POLICY "Admins can delete lane_assignments" ON lane_assignments
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert lane_assignments" ON lane_assignments
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update lane_assignments" ON lane_assignments
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete mini_blok_players" ON mini_blok_players
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert mini_blok_players" ON mini_blok_players
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update mini_blok_players" ON mini_blok_players
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete nav_layout_settings" ON nav_layout_settings
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert nav_layout_settings" ON nav_layout_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update nav_layout_settings" ON nav_layout_settings
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete notification_recipients" ON notification_recipients
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update notification_recipients" ON notification_recipients
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete player_reactions_log" ON player_reactions_log
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert player_reactions_log" ON player_reactions_log
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update player_reactions_log" ON player_reactions_log
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());