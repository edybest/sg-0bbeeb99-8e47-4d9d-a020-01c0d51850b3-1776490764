-- Fix all remaining non-admin policies with correct wrapping
-- These policies were already created but need the is_current_user_admin() check

-- Already good policies that just call is_current_user_admin():
-- These don't need (SELECT auth.uid()) wrapping because is_current_user_admin() 
-- already has it wrapped internally

-- Fix the remaining 19 policies that have unwrapped auth.uid()
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