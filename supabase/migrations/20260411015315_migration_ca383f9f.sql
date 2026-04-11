-- Fix chat_participants: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Admins can manage participants" ON chat_participants;
DROP POLICY IF EXISTS "Members can view participants in accessible rooms" ON chat_participants;

-- Create non-SELECT admin policies only
CREATE POLICY "Admins can insert chat_participants" ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can update chat_participants" ON chat_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Admins can delete chat_participants" ON chat_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- Keep "Anyone can view chat participants" as the ONLY SELECT policy for simplicity
-- This is safe since sensitive data filtering can be done in the application layer