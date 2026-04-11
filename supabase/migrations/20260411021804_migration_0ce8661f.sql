-- Fix mini_blok_shares DELETE with CORRECT column name (owner_id)
DROP POLICY IF EXISTS "Anyone authenticated can delete shares" ON mini_blok_shares;

CREATE POLICY "Restricted delete shares" ON mini_blok_shares
  FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete any
    is_current_user_admin()
    OR
    -- Owner of the mini_blok can delete shares
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    -- Collaborators can delete shares
    EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );