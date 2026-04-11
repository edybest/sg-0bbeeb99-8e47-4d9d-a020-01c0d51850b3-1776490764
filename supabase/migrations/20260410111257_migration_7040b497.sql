-- CRITICAL PERFORMANCE FIX: Batch 2 - comment_bans

DROP POLICY IF EXISTS "admin_manage_bans" ON comment_bans;
CREATE POLICY "admin_manage_bans"
  ON comment_bans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = (SELECT auth.uid())
        AND is_admin = true
    )
  );