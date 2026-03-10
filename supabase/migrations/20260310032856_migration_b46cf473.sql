-- Update session and settings tables
DROP POLICY IF EXISTS "Admin full access to member_sessions" ON member_sessions;
DROP POLICY IF EXISTS "Admin full access to club_settings" ON club_settings;
DROP POLICY IF EXISTS "Members can view own sessions" ON member_sessions;

CREATE POLICY "Admin full access to member_sessions"
  ON member_sessions
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Members can view own sessions"
  ON member_sessions
  FOR SELECT
  TO public
  USING (member_id = get_current_member_id_unified());

CREATE POLICY "Admin full access to club_settings"
  ON club_settings
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());