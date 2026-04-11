-- Continue fixing remaining RLS policies - Batch 9

-- notification_recipients
DROP POLICY IF EXISTS "Admins can create recipients" ON notification_recipients;
CREATE POLICY "Admins can create recipients"
  ON notification_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
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
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- player_reactions_log
DROP POLICY IF EXISTS "auth_insert_player_reactions" ON player_reactions_log;
CREATE POLICY "auth_insert_player_reactions"
  ON player_reactions_log
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);