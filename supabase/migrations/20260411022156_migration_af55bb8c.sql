-- Consolidate mini_blok_shares INSERT policies
DROP POLICY IF EXISTS "Restricted insert shares" ON mini_blok_shares;
DROP POLICY IF EXISTS "optimized_insert_mini_blok_shares" ON mini_blok_shares;

CREATE POLICY "insert_mini_blok_shares" ON mini_blok_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can create any share
    is_current_user_admin()
    OR
    -- Owner can create shares for their mini-bloks
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    -- Collaborators can create shares
    EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );