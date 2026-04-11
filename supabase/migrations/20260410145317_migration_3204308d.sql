-- Continue fixing remaining RLS policies - Batch 3

-- chat_rooms: Members can create rooms
DROP POLICY IF EXISTS "Members can create rooms" ON chat_rooms;
CREATE POLICY "Members can create rooms"
  ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- chat_rooms: Room creators can delete
DROP POLICY IF EXISTS "Room creators can delete" ON chat_rooms;
CREATE POLICY "Room creators can delete"
  ON chat_rooms
  FOR DELETE
  TO authenticated
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- chat_rooms: Room creators can update
DROP POLICY IF EXISTS "Room creators can update" ON chat_rooms;
CREATE POLICY "Room creators can update"
  ON chat_rooms
  FOR UPDATE
  TO authenticated
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- comment_bans: admin_manage_bans
DROP POLICY IF EXISTS "admin_manage_bans" ON comment_bans;
CREATE POLICY "admin_manage_bans"
  ON comment_bans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );