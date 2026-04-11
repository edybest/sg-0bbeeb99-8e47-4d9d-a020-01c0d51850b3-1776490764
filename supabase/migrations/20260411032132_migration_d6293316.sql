-- Fix gallery_images, game_players, game_viewers
DROP POLICY IF EXISTS "Admins can delete gallery_images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can update gallery_images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can delete game_players" ON game_players;
DROP POLICY IF EXISTS "Admins can insert game_players" ON game_players;
DROP POLICY IF EXISTS "Admins can update game_players" ON game_players;
DROP POLICY IF EXISTS "Admins can delete game_viewers" ON game_viewers;
DROP POLICY IF EXISTS "Admins can insert game_viewers" ON game_viewers;
DROP POLICY IF EXISTS "Admins can update game_viewers" ON game_viewers;

CREATE POLICY "Admins can delete gallery_images" ON gallery_images
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update gallery_images" ON gallery_images
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete game_players" ON game_players
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert game_players" ON game_players
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update game_players" ON game_players
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete game_viewers" ON game_viewers
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert game_viewers" ON game_viewers
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update game_viewers" ON game_viewers
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());