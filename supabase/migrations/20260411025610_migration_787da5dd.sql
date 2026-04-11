-- Consolidate member_feedback INSERT policies into ONE policy
-- Combines admin check and member creation
DROP POLICY IF EXISTS "Admins can insert member_feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can create feedback" ON member_feedback;

CREATE POLICY "authenticated_insert_member_feedback" ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert any feedback
    is_current_user_admin()
    OR
    -- Members can create feedback
    auth.uid() IS NOT NULL
  );