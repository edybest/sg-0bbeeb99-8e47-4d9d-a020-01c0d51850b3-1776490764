-- PERFORMANCE FIX 1: Consolidate multiple permissive policies - chat_messages
-- Currently has 3 UPDATE policies, consolidate into 1

DROP POLICY IF EXISTS "Admins can delete any message" ON chat_messages;
DROP POLICY IF EXISTS "Senders can edit own messages" ON chat_messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON chat_messages;

CREATE POLICY "manage_messages" 
  ON chat_messages 
  FOR UPDATE 
  TO public
  USING (
    -- Allow admins OR message senders
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = auth.uid() 
      AND (m.is_admin = true OR sender_id = m.id)
    )
  );