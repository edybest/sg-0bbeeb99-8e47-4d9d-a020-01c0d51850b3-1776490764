-- Batch 9: Fix mini_blok_shares policies (3 policies)
DROP POLICY IF EXISTS "delete_mini_blok_shares" ON mini_blok_shares;
DROP POLICY IF EXISTS "insert_mini_blok_shares" ON mini_blok_shares;
DROP POLICY IF EXISTS "update_mini_blok_shares" ON mini_blok_shares;

CREATE POLICY "delete_mini_blok_shares" ON mini_blok_shares
  FOR DELETE
  TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      INNER JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "insert_mini_blok_shares" ON mini_blok_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      INNER JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "update_mini_blok_shares" ON mini_blok_shares
  FOR UPDATE
  TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      INNER JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );