-- COMPREHENSIVE FIX: Batch 2 - comment_bans, couple_reactions_log, couple_scores, couples

-- comment_bans
DROP POLICY IF EXISTS "admin_manage_bans" ON comment_bans;
CREATE POLICY "admin_manage_bans"
  ON comment_bans
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- couple_reactions_log
DROP POLICY IF EXISTS "auth_insert_couple_reactions" ON couple_reactions_log;
CREATE POLICY "auth_insert_couple_reactions"
  ON couple_reactions_log
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- couple_scores
DROP POLICY IF EXISTS "Admins can insert couple scores" ON couple_scores;
CREATE POLICY "Admins can insert couple scores"
  ON couple_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update couple scores" ON couple_scores;
CREATE POLICY "Admins can update couple scores"
  ON couple_scores
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete couple scores" ON couple_scores;
CREATE POLICY "Admins can delete couple scores"
  ON couple_scores
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- couples
DROP POLICY IF EXISTS "Admins can create couples" ON couples;
CREATE POLICY "Admins can create couples"
  ON couples
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update couples" ON couples;
CREATE POLICY "Admins can update couples"
  ON couples
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete couples" ON couples;
CREATE POLICY "Admins can delete couples"
  ON couples
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));