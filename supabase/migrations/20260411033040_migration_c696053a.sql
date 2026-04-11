-- Consolidate mini_blok duplicate policies
DROP POLICY IF EXISTS "Admins can delete mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "authenticated_delete_mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "Admins can insert mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "authenticated_insert_mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "authenticated_update_mini_blok" ON mini_blok;

CREATE POLICY "authenticated_delete_mini_blok" ON mini_blok
  FOR DELETE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "authenticated_insert_mini_blok" ON mini_blok
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "authenticated_update_mini_blok" ON mini_blok
  FOR UPDATE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok.id
        AND m.user_id = (SELECT auth.uid())
    )
  );