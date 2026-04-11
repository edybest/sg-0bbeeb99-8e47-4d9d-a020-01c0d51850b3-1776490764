-- Continue fixing remaining RLS policies - Batch 5

-- fivefive_games
DROP POLICY IF EXISTS "consolidated_manage_fivefive_games" ON fivefive_games;
CREATE POLICY "consolidated_manage_fivefive_games"
  ON fivefive_games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- fivefive_participants
DROP POLICY IF EXISTS "consolidated_manage_fivefive_participants" ON fivefive_participants;
CREATE POLICY "consolidated_manage_fivefive_participants"
  ON fivefive_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- fivefive_prizes
DROP POLICY IF EXISTS "Authenticated users can manage FiveFive configurations" ON fivefive_prizes;
CREATE POLICY "Authenticated users can manage FiveFive configurations"
  ON fivefive_prizes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- game_comments
DROP POLICY IF EXISTS "auth_insert_comments" ON game_comments;
CREATE POLICY "auth_insert_comments"
  ON game_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "manage_comments" ON game_comments;
CREATE POLICY "manage_comments"
  ON game_comments
  FOR ALL
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );