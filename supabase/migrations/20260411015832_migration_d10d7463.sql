-- Fix mini_blok_shares: Split ALL into separate policies
DROP POLICY IF EXISTS "optimized_manage_mini_blok_shares" ON mini_blok_shares;

CREATE POLICY "optimized_insert_mini_blok_shares" ON mini_blok_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members m WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true)
    OR EXISTS (
      SELECT 1 
      FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 
      FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "optimized_update_mini_blok_shares" ON mini_blok_shares
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members m WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true)
    OR EXISTS (
      SELECT 1 
      FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 
      FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "optimized_delete_mini_blok_shares" ON mini_blok_shares
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members m WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true)
    OR EXISTS (
      SELECT 1 
      FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 
      FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- Keep "Public can read mini_blok_shares token metadata" as the only SELECT policy