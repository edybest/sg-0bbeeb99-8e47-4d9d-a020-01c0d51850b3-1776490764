-- PERFORMANCE FIX 3: Consolidate multiple permissive policies - game_players
-- Currently has 2 ALL policies, consolidate into 1

DROP POLICY IF EXISTS "Members can manage own records" ON game_players;
DROP POLICY IF EXISTS "Admin full access to game_players" ON game_players;

CREATE POLICY "manage_game_players" 
  ON game_players 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = auth.uid() 
      AND (m.is_admin = true OR member_id = m.id)
    )
  );