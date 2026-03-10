-- Fix member_sessions RLS
DROP POLICY IF EXISTS "Admin full access to member_sessions" ON member_sessions;
DROP POLICY IF EXISTS "Members can manage their own sessions" ON member_sessions;

CREATE POLICY "Members can view own sessions"
  ON member_sessions
  FOR SELECT
  TO public
  USING (member_id = get_current_member_id());

CREATE POLICY "Members can create own sessions"
  ON member_sessions
  FOR INSERT
  TO public
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Members can delete own sessions"
  ON member_sessions
  FOR DELETE
  TO public
  USING (member_id = get_current_member_id());

CREATE POLICY "Admin full access to member_sessions"
  ON member_sessions
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());