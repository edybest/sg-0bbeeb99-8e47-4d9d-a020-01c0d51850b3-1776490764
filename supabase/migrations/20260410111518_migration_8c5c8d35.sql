-- CRITICAL PERFORMANCE FIX: Optimize all remaining RLS policies - Batch 3
-- blok_games, couple_reactions_log, couple_scores, couples

-- blok_games
DROP POLICY IF EXISTS "Authenticated users can insert blok games" ON blok_games;
CREATE POLICY "Authenticated users can insert blok games"
  ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
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