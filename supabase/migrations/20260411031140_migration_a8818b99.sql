-- Batch 11: Fix couple-related policies
DROP POLICY IF EXISTS "Admins can delete couple_reactions_log" ON couple_reactions_log;
DROP POLICY IF EXISTS "Admins can delete couple_scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can delete couples" ON couples;
DROP POLICY IF EXISTS "Admins can insert couple_reactions_log" ON couple_reactions_log;
DROP POLICY IF EXISTS "Admins can insert couple_scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can insert couples" ON couples;
DROP POLICY IF EXISTS "Admins can update couples" ON couples;

CREATE POLICY "Admins can delete couple_reactions_log" ON couple_reactions_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can delete couple_scores" ON couple_scores
  FOR DELETE
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

CREATE POLICY "Admins can insert couple_reactions_log" ON couple_reactions_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can insert couple_scores" ON couple_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
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