-- Fix comment_bans: Split ALL into separate policies
DROP POLICY IF EXISTS "admin_manage_bans" ON comment_bans;

CREATE POLICY "admin_insert_bans" ON comment_bans
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "admin_update_bans" ON comment_bans
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "admin_delete_bans" ON comment_bans
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "public_read_bans" as the only SELECT policy