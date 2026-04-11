-- Batch 8: Fix mini_blok_collaborators policies (2 policies)
DROP POLICY IF EXISTS "delete_mini_blok_collaborators" ON mini_blok_collaborators;
DROP POLICY IF EXISTS "insert_mini_blok_collaborators" ON mini_blok_collaborators;

CREATE POLICY "delete_mini_blok_collaborators" ON mini_blok_collaborators
  FOR DELETE
  TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      INNER JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok_collaborators.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "insert_mini_blok_collaborators" ON mini_blok_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      INNER JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );