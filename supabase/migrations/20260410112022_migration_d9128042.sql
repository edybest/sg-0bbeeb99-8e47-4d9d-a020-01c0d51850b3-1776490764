-- Continue optimizing remaining policies - Part 2

-- comment_bans
DROP POLICY IF EXISTS "admin_manage_bans" ON comment_bans;
CREATE POLICY "admin_manage_bans"
  ON comment_bans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = (SELECT auth.uid())
        AND is_admin = true
    )
  );

-- couple_reactions_log
DROP POLICY IF EXISTS "auth_insert_couple_reactions" ON couple_reactions_log;
CREATE POLICY "auth_insert_couple_reactions"
  ON couple_reactions_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- couple_scores
DROP POLICY IF EXISTS "auth_delete_couple_scores" ON couple_scores;
CREATE POLICY "auth_delete_couple_scores"
  ON couple_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

DROP POLICY IF EXISTS "auth_insert_couple_scores" ON couple_scores;
CREATE POLICY "auth_insert_couple_scores"
  ON couple_scores
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "auth_update_couple_scores" ON couple_scores;
CREATE POLICY "auth_update_couple_scores"
  ON couple_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

-- couples
DROP POLICY IF EXISTS "auth_delete_couples" ON couples;
CREATE POLICY "auth_delete_couples"
  ON couples
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

DROP POLICY IF EXISTS "auth_insert_couples" ON couples;
CREATE POLICY "auth_insert_couples"
  ON couples
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "auth_update_couples" ON couples;
CREATE POLICY "auth_update_couples"
  ON couples
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

-- fivefive_prizes
DROP POLICY IF EXISTS "Authenticated users can manage FiveFive configurations" ON fivefive_prizes;
CREATE POLICY "Authenticated users can manage FiveFive configurations"
  ON fivefive_prizes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = (SELECT auth.uid())
        AND is_admin = true
    )
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
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

-- game_players
DROP POLICY IF EXISTS "manage_game_players" ON game_players;
CREATE POLICY "manage_game_players"
  ON game_players
  FOR ALL
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );