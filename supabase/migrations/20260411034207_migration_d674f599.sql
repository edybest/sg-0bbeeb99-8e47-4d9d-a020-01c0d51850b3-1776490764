-- Fix chat_rooms policies (2 policies)
DROP POLICY IF EXISTS "authenticated_insert_chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can view rooms where they participate" ON chat_rooms;

CREATE POLICY "authenticated_insert_chat_rooms" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "Members can view rooms where they participate" ON chat_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON m.id = cp.member_id
      WHERE cp.room_id = chat_rooms.id
        AND m.user_id = (SELECT auth.uid())
    )
  );