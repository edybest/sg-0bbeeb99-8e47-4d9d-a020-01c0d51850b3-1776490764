-- Batch 5 (Final): mini_blok_shares, notification_recipients, notifications, player_reactions_log, profiles, training_scores

-- mini_blok_shares
DROP POLICY IF EXISTS "Admins, owners, collaborators can manage shares" ON mini_blok_shares;
CREATE POLICY "Admins, owners, collaborators can manage shares"
  ON mini_blok_shares
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON mbc.member_id = m.id
      WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id AND m.user_id = (SELECT auth.uid())
    )
  );

-- notification_recipients
DROP POLICY IF EXISTS "Members can update own notification status" ON notification_recipients;
CREATE POLICY "Members can update own notification status"
  ON notification_recipients
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can view own notifications" ON notification_recipients;
CREATE POLICY "Members can view own notifications"
  ON notification_recipients
  FOR SELECT
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- player_reactions_log
DROP POLICY IF EXISTS "auth_insert_player_reactions_log" ON player_reactions_log;
CREATE POLICY "auth_insert_player_reactions_log"
  ON player_reactions_log
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- training_scores - Check if table exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'training_scores') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members can view own training scores" ON training_scores';
    EXECUTE 'CREATE POLICY "Members can view own training scores" ON training_scores FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())))';
  END IF;
END $$;