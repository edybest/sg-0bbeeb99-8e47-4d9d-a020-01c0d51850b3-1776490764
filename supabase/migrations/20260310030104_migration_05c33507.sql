-- Fix fivefive_participants RLS
DROP POLICY IF EXISTS "Admin full access to fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Anyone can view fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Members can manage their own fivefive participation" ON fivefive_participants;

CREATE POLICY "Anyone can view fivefive_participants"
  ON fivefive_participants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can manage own participation"
  ON fivefive_participants
  FOR ALL
  TO public
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to fivefive_participants"
  ON fivefive_participants
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());