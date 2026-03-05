-- Also drop duplicate game_players policies
DROP POLICY IF EXISTS "Admins can manage game_players" ON game_players;

-- Keep only the one that uses is_admin() function
-- (The other policy "Admins can manage game players" already uses is_admin())