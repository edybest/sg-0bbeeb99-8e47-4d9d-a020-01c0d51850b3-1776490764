-- Fix member_feedback INSERT policy - wrap auth.uid() with SELECT
DROP POLICY IF EXISTS "authenticated_insert_member_feedback" ON member_feedback;

CREATE POLICY "authenticated_insert_member_feedback" ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert any feedback
    is_current_user_admin()
    OR
    -- Members can create feedback
    (SELECT auth.uid()) IS NOT NULL
  );