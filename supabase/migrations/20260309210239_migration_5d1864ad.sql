-- Update member_sessions RLS policies
DROP POLICY IF EXISTS "Members can view their own sessions" ON member_sessions;
DROP POLICY IF EXISTS "Members can manage their own sessions" ON member_sessions;
DROP POLICY IF EXISTS "Admin can do everything on member_sessions" ON member_sessions;

-- New optimized policies
CREATE POLICY "Members can view their own sessions"
  ON member_sessions FOR SELECT
  USING (member_id = get_current_member_id());

CREATE POLICY "Members can manage their own sessions"
  ON member_sessions FOR ALL
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to member_sessions"
  ON member_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );