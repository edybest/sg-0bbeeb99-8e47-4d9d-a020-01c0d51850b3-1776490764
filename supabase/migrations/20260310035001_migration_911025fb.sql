-- 4. Training_scores table
DROP POLICY IF EXISTS "Anyone can view training scores" ON training_scores;
DROP POLICY IF EXISTS "Admin full access to training_scores" ON training_scores;

CREATE POLICY "Anyone can view training scores"
  ON training_scores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to training_scores"
  ON training_scores
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 5. Fivefive_games table
DROP POLICY IF EXISTS "Anyone can view fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "Admin full access to fivefive_games" ON fivefive_games;

CREATE POLICY "Anyone can view fivefive_games"
  ON fivefive_games
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to fivefive_games"
  ON fivefive_games
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 6. Fivefive_participants table
DROP POLICY IF EXISTS "Anyone can view fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Admin full access to fivefive_participants" ON fivefive_participants;

CREATE POLICY "Anyone can view fivefive_participants"
  ON fivefive_participants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to fivefive_participants"
  ON fivefive_participants
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());