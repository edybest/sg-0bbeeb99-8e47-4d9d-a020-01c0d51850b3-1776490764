-- Fix the FINAL unoptimized policy for mini_blok_shares
DROP POLICY IF EXISTS "Admins, owners, collaborators can manage shares" ON mini_blok_shares;

CREATE POLICY "optimized_manage_mini_blok_shares"
  ON mini_blok_shares
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = (SELECT auth.uid()) 
        AND (
          m.is_admin = true
          OR EXISTS (
            SELECT 1 FROM mini_blok mb 
            WHERE mb.id = mini_blok_shares.mini_blok_id 
              AND mb.owner_id = m.id
          )
          OR EXISTS (
            SELECT 1 FROM mini_blok_collaborators mbc
            WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
              AND mbc.member_id = m.id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = (SELECT auth.uid()) 
        AND (
          m.is_admin = true
          OR EXISTS (
            SELECT 1 FROM mini_blok mb 
            WHERE mb.id = mini_blok_shares.mini_blok_id 
              AND mb.owner_id = m.id
          )
          OR EXISTS (
            SELECT 1 FROM mini_blok_collaborators mbc
            WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
              AND mbc.member_id = m.id
          )
        )
    )
  );