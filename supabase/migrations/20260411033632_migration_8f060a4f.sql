-- Consolidate chat_rooms INSERT policies (2 duplicates)
DROP POLICY IF EXISTS "Admins can insert chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "authenticated_insert_chat_rooms" ON chat_rooms;

-- Create single consolidated INSERT policy with auth.uid() wrapped
CREATE POLICY "authenticated_insert_chat_rooms" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );