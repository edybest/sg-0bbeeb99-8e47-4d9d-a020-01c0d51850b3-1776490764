-- Fix policies with CORRECT column names

-- fivefive_games - has no member_id, just public read + admin write
DROP POLICY IF EXISTS "Members can manage own fivefive games" ON fivefive_games;
CREATE POLICY "consolidated_manage_fivefive_games"
  ON fivefive_games
  FOR ALL
  TO authenticated
  USING (
    true  -- Public read access
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- fivefive_participants - uses member_id (correct)
DROP POLICY IF EXISTS "Members can manage own fivefive participation" ON fivefive_participants;
CREATE POLICY "consolidated_manage_fivefive_participants"
  ON fivefive_participants
  FOR ALL
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR fivefive_game_id IN (SELECT id FROM fivefive_games)  -- All can view fivefive participants
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- couples - uses player1_id and player2_id
DROP POLICY IF EXISTS "consolidated_manage_couples" ON couples;
CREATE POLICY "consolidated_manage_couples"
  ON couples
  FOR ALL
  TO authenticated
  USING (
    player1_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR player2_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- nav_layout_settings - has no member_id, just key/value pairs (admin only)
DROP POLICY IF EXISTS "consolidated_manage_nav_layout_settings" ON nav_layout_settings;
CREATE POLICY "consolidated_manage_nav_layout_settings"
  ON nav_layout_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );