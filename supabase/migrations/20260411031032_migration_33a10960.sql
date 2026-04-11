-- Batch 7: Fix mini_blok policies (4 policies)
DROP POLICY IF EXISTS "authenticated_delete_mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "authenticated_insert_mini_blok" ON mini_blok;

CREATE POLICY "authenticated_delete_mini_blok" ON mini_blok
  FOR DELETE
  TO authenticated
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
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id
        AND m.user_id = (SELECT auth.uid())
    )
  );