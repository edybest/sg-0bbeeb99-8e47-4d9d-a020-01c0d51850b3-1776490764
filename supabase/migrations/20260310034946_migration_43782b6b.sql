-- Update ALL RLS policies to use native Supabase Auth only
-- 1. Members table
DROP POLICY IF EXISTS "Anyone can view members" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;
DROP POLICY IF EXISTS "Admin full access to members" ON members;

CREATE POLICY "Anyone can view members"
  ON members
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access to members"
  ON members
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 2. Games table
DROP POLICY IF EXISTS "Anyone can view games" ON games;
DROP POLICY IF EXISTS "Admin full access to games" ON games;

CREATE POLICY "Anyone can view games"
  ON games
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to games"
  ON games
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 3. Game_players table
DROP POLICY IF EXISTS "Anyone can view game_players" ON game_players;
DROP POLICY IF EXISTS "Members can manage own records" ON game_players;
DROP POLICY IF EXISTS "Admin full access to game_players" ON game_players;

CREATE POLICY "Anyone can view game_players"
  ON game_players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can manage own records"
  ON game_players
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = game_players.member_id 
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = game_players.member_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin full access to game_players"
  ON game_players
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());