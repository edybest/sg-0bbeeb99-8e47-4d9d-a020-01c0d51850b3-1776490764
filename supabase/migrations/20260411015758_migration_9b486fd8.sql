-- Fix member_sessions: Split ALL into separate policies
DROP POLICY IF EXISTS "Admin full access to member_sessions" ON member_sessions;

CREATE POLICY "Admins can insert member_sessions" ON member_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update member_sessions" ON member_sessions
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete member_sessions" ON member_sessions
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Add public SELECT policy
CREATE POLICY "Anyone can view member_sessions" ON member_sessions
  FOR SELECT
  TO public
  USING (true);