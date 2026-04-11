-- Fix chat_participants and chat_rooms with CORRECT column names
DROP POLICY IF EXISTS "Admins can delete chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can insert chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can update chat_participants" ON chat_participants;

CREATE POLICY "Admins can delete chat_participants" ON chat_participants
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert chat_participants" ON chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update chat_participants" ON chat_participants
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());