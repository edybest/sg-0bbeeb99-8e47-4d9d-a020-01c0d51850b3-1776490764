-- Fix chat_rooms SELECT policy
DROP POLICY IF EXISTS "Members can view rooms where they participate" ON chat_rooms;

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