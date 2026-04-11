-- SYSTEMATIC FIX: Batch 6 (members, mini_blok, mini_blok_collaborators, mini_blok_players)

-- members
DROP POLICY IF EXISTS "Members can update own profile" ON members;
CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- mini_blok
DROP POLICY IF EXISTS "owner_collab_update_mini_blok" ON mini_blok;
CREATE POLICY "owner_collab_update_mini_blok"
  ON mini_blok
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok.id AND m.user_id = (SELECT auth.uid())
    )
  );

-- mini_blok_collaborators
DROP POLICY IF EXISTS "auth_delete_mini_blok_collaborators" ON mini_blok_collaborators;
CREATE POLICY "auth_delete_mini_blok_collaborators"
  ON mini_blok_collaborators
  FOR DELETE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "auth_insert_mini_blok_collaborators" ON mini_blok_collaborators;
CREATE POLICY "auth_insert_mini_blok_collaborators"
  ON mini_blok_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "auth_update_mini_blok_collaborators" ON mini_blok_collaborators;
CREATE POLICY "auth_update_mini_blok_collaborators"
  ON mini_blok_collaborators
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  );

-- mini_blok_players
DROP POLICY IF EXISTS "auth_delete_mini_blok_players" ON mini_blok_players;
CREATE POLICY "auth_delete_mini_blok_players"
  ON mini_blok_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_players.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id AND m.user_id = (SELECT auth.uid())
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
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_players.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id AND m.user_id = (SELECT auth.uid())
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
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_players.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  );