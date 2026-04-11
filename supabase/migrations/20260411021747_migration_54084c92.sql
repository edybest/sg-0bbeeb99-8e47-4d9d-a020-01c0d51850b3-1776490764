-- Fix mini_blok_shares UPDATE with CORRECT column name (owner_id)
DROP POLICY IF EXISTS "Anyone authenticated can update shares" ON mini_blok_shares;

CREATE POLICY "Restricted update shares" ON mini_blok_shares
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update any
    is_current_user_admin()
    OR
    -- Owner of the mini_blok can update shares
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    -- Collaborators can update shares
    EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );