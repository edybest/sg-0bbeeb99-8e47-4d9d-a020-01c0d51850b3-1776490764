-- COMPREHENSIVE FIX: Batch 3 - fivefive_games, fivefive_participants, fivefive_prizes, gallery_albums

-- fivefive_games
DROP POLICY IF EXISTS "Admins can create 5-5 games" ON fivefive_games;
CREATE POLICY "Admins can create 5-5 games"
  ON fivefive_games
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete 5-5 games" ON fivefive_games;
CREATE POLICY "Admins can delete 5-5 games"
  ON fivefive_games
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update 5-5 games" ON fivefive_games;
CREATE POLICY "Admins can update 5-5 games"
  ON fivefive_games
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- fivefive_participants
DROP POLICY IF EXISTS "Members can register for 5-5 games" ON fivefive_participants;
CREATE POLICY "Members can register for 5-5 games"
  ON fivefive_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- fivefive_prizes
DROP POLICY IF EXISTS "Admins can create prizes" ON fivefive_prizes;
CREATE POLICY "Admins can create prizes"
  ON fivefive_prizes
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete prizes" ON fivefive_prizes;
CREATE POLICY "Admins can delete prizes"
  ON fivefive_prizes
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update prizes" ON fivefive_prizes;
CREATE POLICY "Admins can update prizes"
  ON fivefive_prizes
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- gallery_albums
DROP POLICY IF EXISTS "Admin and permitted members can delete albums" ON gallery_albums;
CREATE POLICY "Admin and permitted members can delete albums"
  ON gallery_albums
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND gp.can_delete_albums = true
    )
  );

DROP POLICY IF EXISTS "Admin and permitted members can update albums" ON gallery_albums;
CREATE POLICY "Admin and permitted members can update albums"
  ON gallery_albums
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND gp.can_edit_albums = true
    )
  );