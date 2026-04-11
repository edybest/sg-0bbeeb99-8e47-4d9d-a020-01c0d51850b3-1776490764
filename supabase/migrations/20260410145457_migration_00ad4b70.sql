-- Continue fixing remaining RLS policies - Batch 10 (Final)

-- profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    id = (SELECT auth.uid())
  );

-- push_subscriptions (remaining policies)
DROP POLICY IF EXISTS "consolidated_delete_push_subscriptions" ON push_subscriptions;
CREATE POLICY "consolidated_delete_push_subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "consolidated_insert_push_subscriptions" ON push_subscriptions;
CREATE POLICY "consolidated_insert_push_subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "consolidated_update_push_subscriptions" ON push_subscriptions;
CREATE POLICY "consolidated_update_push_subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );