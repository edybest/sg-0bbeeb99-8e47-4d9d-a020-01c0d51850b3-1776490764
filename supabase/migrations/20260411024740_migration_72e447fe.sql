-- Consolidate chat_rooms INSERT policies into ONE policy
-- Combines "Admins can insert chat_rooms" + "Members can create rooms"
DROP POLICY IF EXISTS "Admins can insert chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can create rooms" ON chat_rooms;

CREATE POLICY "authenticated_insert_chat_rooms" ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can create any room
    is_current_user_admin()
    OR
    -- Members can create rooms
    auth.uid() IS NOT NULL
  );