-- Create RLS policies for push_subscriptions
-- Users should be able to manage their own push subscriptions

-- SELECT: Users can view their own subscriptions, admins can view all
CREATE POLICY "authenticated_select_push_subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1
      FROM members m
      WHERE m.id = push_subscriptions.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: Users can create their own subscriptions
CREATE POLICY "authenticated_insert_push_subscriptions" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1
      FROM members m
      WHERE m.id = push_subscriptions.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- UPDATE: Users can update their own subscriptions
CREATE POLICY "authenticated_update_push_subscriptions" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1
      FROM members m
      WHERE m.id = push_subscriptions.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- DELETE: Users can delete their own subscriptions
CREATE POLICY "authenticated_delete_push_subscriptions" ON push_subscriptions
  FOR DELETE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1
      FROM members m
      WHERE m.id = push_subscriptions.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );