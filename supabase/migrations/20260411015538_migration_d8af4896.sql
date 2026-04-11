-- Fix remaining tables with ALL policies - Batch 1

-- chat_rooms: Split ALL into separate policies
DROP POLICY IF EXISTS "Admins can manage rooms" ON chat_rooms;

CREATE POLICY "Admins can insert chat_rooms" ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can update chat_rooms" ON chat_rooms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can delete chat_rooms" ON chat_rooms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- Keep "Members can view rooms where they participate" as SELECT policy