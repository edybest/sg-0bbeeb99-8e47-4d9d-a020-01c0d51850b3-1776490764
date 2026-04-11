-- Batch 12: Fix chat-related policies
DROP POLICY IF EXISTS "Admins can delete chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can delete chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can delete chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can insert chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can insert chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can update chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can update chat_rooms" ON chat_rooms;

CREATE POLICY "Admins can delete chat_messages" ON chat_messages
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete chat_participants" ON chat_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can delete chat_rooms" ON chat_rooms
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert chat_participants" ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can insert chat_rooms" ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "Admins can update chat_participants" ON chat_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can update chat_rooms" ON chat_rooms
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());