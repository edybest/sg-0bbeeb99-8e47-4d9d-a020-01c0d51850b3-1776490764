-- Batch 3: Fix chat_participants policies (3 policies)
DROP POLICY IF EXISTS "Admins can delete chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can insert chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Admins can update chat_participants" ON chat_participants;

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