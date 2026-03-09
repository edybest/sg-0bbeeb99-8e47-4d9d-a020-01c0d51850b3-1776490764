-- Update fivefive_participants RLS policies
DROP POLICY IF EXISTS "Anyone can view fivefive participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Members can manage their own participation" ON fivefive_participants;
DROP POLICY IF EXISTS "Admin can do everything on fivefive_participants" ON fivefive_participants;

-- New optimized policies
CREATE POLICY "Anyone can view fivefive_participants"
  ON fivefive_participants FOR SELECT
  USING (true);

CREATE POLICY "Members can manage their own fivefive participation"
  ON fivefive_participants FOR ALL
  USING (member_id = get_current_member_id())
  WITH CHECK (member_id = get_current_member_id());

CREATE POLICY "Admin full access to fivefive_participants"
  ON fivefive_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );