-- Fix blok_games - consolidate and optimize
DROP POLICY IF EXISTS "Admins can delete blok_games" ON blok_games;
DROP POLICY IF EXISTS "Members can delete own blok_games" ON blok_games;
DROP POLICY IF EXISTS "Admins can insert blok_games" ON blok_games;
DROP POLICY IF EXISTS "Members can insert blok_games" ON blok_games;
DROP POLICY IF EXISTS "Admins can update blok_games" ON blok_games;
DROP POLICY IF EXISTS "Members can update own blok_games" ON blok_games;

-- Create single consolidated DELETE policy
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

-- Create single consolidated INSERT policy
CREATE POLICY "authenticated_insert_blok_games" ON blok_games
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );

-- Create single consolidated UPDATE policy
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