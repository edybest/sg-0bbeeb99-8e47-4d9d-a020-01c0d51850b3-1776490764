-- Fix notification_recipients and player_reactions_log policies
DROP POLICY IF EXISTS "Members can view own notifications" ON notification_recipients;
DROP POLICY IF EXISTS "Members can update own notification status" ON notification_recipients;
DROP POLICY IF EXISTS "auth_insert_player_reactions_log" ON player_reactions_log;

CREATE POLICY "Members can view own notifications" ON notification_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = notification_recipients.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can update own notification status" ON notification_recipients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = notification_recipients.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "auth_insert_player_reactions_log" ON player_reactions_log
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());