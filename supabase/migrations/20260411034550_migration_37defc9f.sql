-- Fix blok_games policies (these already exist but may need re-creation with explicit SELECT wrapping)
DROP POLICY IF EXISTS "authenticated_delete_blok_games" ON blok_games;
DROP POLICY IF EXISTS "authenticated_insert_blok_games" ON blok_games;
DROP POLICY IF EXISTS "authenticated_update_blok_games" ON blok_games;

CREATE POLICY "authenticated_delete_blok_games" ON blok_games
  FOR DELETE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "authenticated_insert_blok_games" ON blok_games
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "authenticated_update_blok_games" ON blok_games
  FOR UPDATE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );