-- Batch 5: Fix couple_reactions_log, couple_scores, couples policies (7 policies)
DROP POLICY IF EXISTS "auth_insert_couple_reactions_log" ON couple_reactions_log;
DROP POLICY IF EXISTS "Admins can delete couple scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can insert couple scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can update couple scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can delete couples" ON couples;
DROP POLICY IF EXISTS "Admins can insert couples" ON couples;
DROP POLICY IF EXISTS "Admins can update couples" ON couples;

CREATE POLICY "auth_insert_couple_reactions_log" ON couple_reactions_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins can delete couple scores" ON couple_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can insert couple scores" ON couple_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can update couple scores" ON couple_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can delete couples" ON couples
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can insert couples" ON couples
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can update couples" ON couples
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );