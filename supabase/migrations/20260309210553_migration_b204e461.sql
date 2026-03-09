-- Clean up DUPLICATE policies on game_players
DROP POLICY IF EXISTS "Admins can manage game players" ON game_players;
DROP POLICY IF EXISTS "Anyone can view game players" ON game_players;

-- Keep: "Admin full access to game_players", "Anyone can view game_players", "Members can manage their own game records"