-- Fix notification_recipients, profiles, gallery_albums policies (4 policies)
DROP POLICY IF EXISTS "Members can view own notifications" ON notification_recipients;
DROP POLICY IF EXISTS "Members can update own notification status" ON notification_recipients;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and permitted members can create albums" ON gallery_albums;

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

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Admin and permitted members can create albums" ON gallery_albums
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON m.id = gp.member_id
      WHERE m.user_id = (SELECT auth.uid())
    )
  );