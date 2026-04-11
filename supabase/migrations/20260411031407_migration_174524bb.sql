-- Batch 14: Fix fivefive_games, fivefive_participants, fivefive_prizes
DROP POLICY IF EXISTS "Admins can delete fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "Admins can insert fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "Admins can update fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "Admins can delete fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Admins can insert fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Admins can update fivefive_participants" ON fivefive_participants;
DROP POLICY IF EXISTS "Admins can delete fivefive_prizes" ON fivefive_prizes;
DROP POLICY IF EXISTS "Admins can insert fivefive_prizes" ON fivefive_prizes;
DROP POLICY IF EXISTS "Admins can update fivefive_prizes" ON fivefive_prizes;

CREATE POLICY "Admins can delete fivefive_games" ON fivefive_games
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert fivefive_games" ON fivefive_games
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update fivefive_games" ON fivefive_games
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete fivefive_participants" ON fivefive_participants
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert fivefive_participants" ON fivefive_participants
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update fivefive_participants" ON fivefive_participants
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete fivefive_prizes" ON fivefive_prizes
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert fivefive_prizes" ON fivefive_prizes
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update fivefive_prizes" ON fivefive_prizes
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());