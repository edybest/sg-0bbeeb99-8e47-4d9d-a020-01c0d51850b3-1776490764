-- Fix mini_blok policies with CORRECT column name: owner_id
DROP POLICY IF EXISTS "auth_insert_mini_blok" ON mini_blok;
CREATE POLICY "auth_insert_mini_blok"
  ON mini_blok
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "owner_collab_update_mini_blok" ON mini_blok;
CREATE POLICY "owner_collab_update_mini_blok"
  ON mini_blok
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok.id
        AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "owner_delete_mini_blok" ON mini_blok;
CREATE POLICY "owner_delete_mini_blok"
  ON mini_blok
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- Fix mini_blok_players policies
DROP POLICY IF EXISTS "auth_delete_mini_blok_players" ON mini_blok_players;
CREATE POLICY "auth_delete_mini_blok_players"
  ON mini_blok_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_players.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "auth_insert_mini_blok_players" ON mini_blok_players;
CREATE POLICY "auth_insert_mini_blok_players"
  ON mini_blok_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_players.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "auth_update_mini_blok_players" ON mini_blok_players;
CREATE POLICY "auth_update_mini_blok_players"
  ON mini_blok_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_players.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- Fix mini_blok_shares policies
DROP POLICY IF EXISTS "Admins, owners, and collaborators can create shares" ON mini_blok_shares;
CREATE POLICY "Admins, owners, and collaborators can create shares"
  ON mini_blok_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );