-- Batch 1: Fix blok_games policies (3 policies)
DROP POLICY IF EXISTS "Authenticated users can create blok games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can delete own blok games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can update own blok games" ON blok_games;

CREATE POLICY "Authenticated users can create blok games" ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete own blok games" ON blok_games
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update own blok games" ON blok_games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );