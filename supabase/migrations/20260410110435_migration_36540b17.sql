-- CORRECTED FIX: Consolidate push_subscriptions policies with correct column names
-- Drop old policies
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Members can manage own subscriptions" ON push_subscriptions;

-- Create consolidated SELECT policy using the correct columns
CREATE POLICY "consolidated_select_push_subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Members can view their own subscriptions (using member_id column)
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR
    -- Admins can view all subscriptions
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() AND m.is_admin = true
    )
  );

-- Recreate other policies for completeness
CREATE POLICY "consolidated_insert_push_subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "consolidated_update_push_subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "consolidated_delete_push_subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
  );