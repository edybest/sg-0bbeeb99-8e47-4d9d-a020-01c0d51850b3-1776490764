-- CRITICAL PERFORMANCE FIX: Optimize remaining policies - Batch 7 (Final)
-- nav_layout_settings, notification_recipients, notifications, player_reactions_log
-- profiles, push_subscriptions, training_scores

-- nav_layout_settings
DROP POLICY IF EXISTS "Admins can write nav_layout_settings" ON nav_layout_settings;
CREATE POLICY "Admins can write nav_layout_settings"
  ON nav_layout_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

-- notification_recipients
DROP POLICY IF EXISTS "Admins can create recipients" ON notification_recipients;
CREATE POLICY "Admins can create recipients"
  ON notification_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Recipients can mark read" ON notification_recipients;
CREATE POLICY "Recipients can mark read"
  ON notification_recipients
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Recipients can view their notifications" ON notification_recipients;
CREATE POLICY "Recipients can view their notifications"
  ON notification_recipients
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- player_reactions_log
DROP POLICY IF EXISTS "auth_insert_player_reactions" ON player_reactions_log;
CREATE POLICY "auth_insert_player_reactions"
  ON player_reactions_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- push_subscriptions - already optimized with consolidated policies
-- Verify they use SELECT wrapper
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
  );

-- training_scores
DROP POLICY IF EXISTS "Members can delete own training scores" ON training_scores;
CREATE POLICY "Members can delete own training scores"
  ON training_scores
  FOR DELETE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Members can insert own training scores" ON training_scores;
CREATE POLICY "Members can insert own training scores"
  ON training_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Members can update own training scores" ON training_scores;
CREATE POLICY "Members can update own training scores"
  ON training_scores
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );