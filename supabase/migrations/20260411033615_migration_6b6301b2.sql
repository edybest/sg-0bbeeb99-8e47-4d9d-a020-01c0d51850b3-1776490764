-- CRITICAL: Consolidate blok_games from 9 policies down to 3
-- Drop all existing blok_games policies
DROP POLICY IF EXISTS "Authenticated users can delete blok_games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can delete own blok games" ON blok_games;
DROP POLICY IF EXISTS "authenticated_delete_blok_games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can create blok games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can insert blok_games" ON blok_games;
DROP POLICY IF EXISTS "authenticated_insert_blok_games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can update blok_games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can update own blok games" ON blok_games;
DROP POLICY IF EXISTS "authenticated_update_blok_games" ON blok_games;

-- Create 3 consolidated policies with proper auth.uid() wrapping
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
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = blok_games.member_id
        AND m.user_id = (SELECT auth.uid())
    )
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