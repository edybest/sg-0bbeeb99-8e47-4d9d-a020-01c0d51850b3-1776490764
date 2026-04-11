-- Fix member_feedback, members policies
DROP POLICY IF EXISTS "authenticated_insert_member_feedback" ON member_feedback;
DROP POLICY IF EXISTS "authenticated_update_members" ON members;

CREATE POLICY "authenticated_insert_member_feedback" ON member_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "authenticated_update_members" ON members
  FOR UPDATE TO authenticated
  USING (
    is_current_user_admin()
    OR
    user_id = (SELECT auth.uid())
  );