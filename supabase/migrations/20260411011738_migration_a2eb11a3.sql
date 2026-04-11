-- Fix the mini_blok_shares policy - replace with optimized version
DROP POLICY IF EXISTS "Admins, owners, collaborators can manage shares" ON mini_blok_shares;

CREATE POLICY "Admins, owners, collaborators can manage shares"
  ON mini_blok_shares
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  );