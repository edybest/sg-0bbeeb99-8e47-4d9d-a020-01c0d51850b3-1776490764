-- Fix chat_messages policies with CORRECT column name (sender_id)
DROP POLICY IF EXISTS "Admins can delete any message" ON chat_messages;
DROP POLICY IF EXISTS "Members can create messages in accessible rooms" ON chat_messages;
DROP POLICY IF EXISTS "Members can view messages in accessible rooms" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;

CREATE POLICY "Admins can delete any message" ON chat_messages
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Members can create messages in accessible rooms" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON m.id = cp.member_id
      WHERE cp.room_id = chat_messages.room_id
        AND m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
        AND cp.is_silenced = false
    )
  );

CREATE POLICY "Members can view messages in accessible rooms" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON m.id = cp.member_id
      WHERE cp.room_id = chat_messages.room_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can update own messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = chat_messages.sender_id
        AND m.user_id = (SELECT auth.uid())
    )
  );