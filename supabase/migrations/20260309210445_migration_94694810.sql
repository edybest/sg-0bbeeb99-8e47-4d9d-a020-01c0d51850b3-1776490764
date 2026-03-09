-- Fix fivefive_games RLS policies
DROP POLICY IF EXISTS "Admins can manage fivefive games" ON fivefive_games;
DROP POLICY IF EXISTS "Anyone can view fivefive games" ON fivefive_games;

CREATE POLICY "Admin full access to fivefive_games"
  ON fivefive_games
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view fivefive_games"
  ON fivefive_games
  FOR SELECT
  TO public
  USING (true);