-- Batch 10: Fix remaining policies (blok_games, couple_reactions_log, couple_scores, couples, gallery_albums)
DROP POLICY IF EXISTS "Authenticated users can delete blok_games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can insert blok_games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can update blok_games" ON blok_games;

CREATE POLICY "Authenticated users can delete blok_games" ON blok_games
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert blok_games" ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated users can update blok_games" ON blok_games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );