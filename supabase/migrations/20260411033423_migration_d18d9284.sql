-- Fix remaining tables in one comprehensive batch
DROP POLICY IF EXISTS "Members can view own notifications" ON notification_recipients;
DROP POLICY IF EXISTS "Members can update own notification status" ON notification_recipients;

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