-- Fix ONLY existing tables - Batch 1: club_settings, comment_bans
DROP POLICY IF EXISTS "Admins can delete club_settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can insert club_settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can update club_settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can delete comment_bans" ON comment_bans;
DROP POLICY IF EXISTS "Admins can insert comment_bans" ON comment_bans;
DROP POLICY IF EXISTS "Admins can update comment_bans" ON comment_bans;

CREATE POLICY "Admins can delete club_settings" ON club_settings
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert club_settings" ON club_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update club_settings" ON club_settings
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete comment_bans" ON comment_bans
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert comment_bans" ON comment_bans
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update comment_bans" ON comment_bans
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());