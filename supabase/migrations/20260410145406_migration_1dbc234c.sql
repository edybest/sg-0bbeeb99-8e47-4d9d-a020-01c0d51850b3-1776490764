-- Continue fixing remaining RLS policies - Batch 6

-- game_players
DROP POLICY IF EXISTS "manage_game_players" ON game_players;
CREATE POLICY "manage_game_players"
  ON game_players
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- game_viewers
DROP POLICY IF EXISTS "members_manage_own_presence" ON game_viewers;
CREATE POLICY "members_manage_own_presence"
  ON game_viewers
  FOR ALL
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- lane_assignments
DROP POLICY IF EXISTS "manage_lane_assignments" ON lane_assignments;
CREATE POLICY "manage_lane_assignments"
  ON lane_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- lane_spin_results
DROP POLICY IF EXISTS "Members can insert own lane spin results" ON lane_spin_results;
CREATE POLICY "Members can insert own lane spin results"
  ON lane_spin_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );