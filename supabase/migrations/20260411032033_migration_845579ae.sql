-- Fix couple_reactions_log
DROP POLICY IF EXISTS "Admins can delete couple_reactions_log" ON couple_reactions_log;
DROP POLICY IF EXISTS "Admins can insert couple_reactions_log" ON couple_reactions_log;
DROP POLICY IF EXISTS "Admins can update couple_reactions_log" ON couple_reactions_log;

CREATE POLICY "Admins can delete couple_reactions_log" ON couple_reactions_log
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert couple_reactions_log" ON couple_reactions_log
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update couple_reactions_log" ON couple_reactions_log
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());