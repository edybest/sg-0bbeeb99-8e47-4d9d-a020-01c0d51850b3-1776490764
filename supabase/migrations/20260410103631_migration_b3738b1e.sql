-- SECURITY FIX 1: Replace overly permissive RLS policies with proper auth checks
-- mini_blok table - require authentication for all write operations
DROP POLICY IF EXISTS "Anyone authenticated can create mini blok" ON mini_blok;
DROP POLICY IF EXISTS "Only owner can delete mini blok" ON mini_blok;
DROP POLICY IF EXISTS "Owner and collaborators can update mini blok" ON mini_blok;

CREATE POLICY "auth_insert_mini_blok"
  ON mini_blok FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    owner_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "owner_delete_mini_blok"
  ON mini_blok FOR DELETE
  TO public
  USING (
    owner_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "owner_collab_update_mini_blok"
  ON mini_blok FOR UPDATE
  TO public
  USING (
    owner_id IN (SELECT id FROM members WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok.id AND m.user_id = auth.uid()
    )
  );

-- mini_blok_players table - proper auth checks
DROP POLICY IF EXISTS "Anyone authenticated can insert players" ON mini_blok_players;
DROP POLICY IF EXISTS "Anyone authenticated can update players" ON mini_blok_players;
DROP POLICY IF EXISTS "Anyone authenticated can delete players" ON mini_blok_players;

CREATE POLICY "auth_insert_mini_blok_players"
  ON mini_blok_players FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_players.mini_blok_id AND m.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "auth_update_mini_blok_players"
  ON mini_blok_players FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_players.mini_blok_id AND m.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "auth_delete_mini_blok_players"
  ON mini_blok_players FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_players.mini_blok_id AND m.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_players.mini_blok_id AND m.user_id = auth.uid()
    )
  );