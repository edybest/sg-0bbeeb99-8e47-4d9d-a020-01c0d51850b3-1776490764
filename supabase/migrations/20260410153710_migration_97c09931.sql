-- Fix remaining tables that DO exist: game_comments, game_players, game_viewers, games

-- game_comments
DROP POLICY IF EXISTS "Members can delete own comments" ON game_comments;
CREATE POLICY "Members can delete own comments"
  ON game_comments
  FOR DELETE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can insert comments" ON game_comments;
CREATE POLICY "Members can insert comments"
  ON game_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can update own comments" ON game_comments;
CREATE POLICY "Members can update own comments"
  ON game_comments
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- game_players
DROP POLICY IF EXISTS "Admins can create game players" ON game_players;
CREATE POLICY "Admins can create game players"
  ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete game players" ON game_players;
CREATE POLICY "Admins can delete game players"
  ON game_players
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update game players" ON game_players;
CREATE POLICY "Admins can update game players"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- game_viewers
DROP POLICY IF EXISTS "auth_delete_game_viewers" ON game_viewers;
CREATE POLICY "auth_delete_game_viewers"
  ON game_viewers
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "auth_insert_game_viewers" ON game_viewers;
CREATE POLICY "auth_insert_game_viewers"
  ON game_viewers
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "auth_update_game_viewers" ON game_viewers;
CREATE POLICY "auth_update_game_viewers"
  ON game_viewers
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

-- games
DROP POLICY IF EXISTS "auth_delete_games" ON games;
CREATE POLICY "auth_delete_games"
  ON games
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "auth_insert_games" ON games;
CREATE POLICY "auth_insert_games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));

DROP POLICY IF EXISTS "auth_update_games" ON games;
CREATE POLICY "auth_update_games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true));