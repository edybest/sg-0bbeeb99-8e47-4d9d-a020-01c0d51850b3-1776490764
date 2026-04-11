-- Continue fixing remaining RLS policies - Batch 4

-- couple_scores
DROP POLICY IF EXISTS "auth_delete_couple_scores" ON couple_scores;
CREATE POLICY "auth_delete_couple_scores"
  ON couple_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "auth_insert_couple_scores" ON couple_scores;
CREATE POLICY "auth_insert_couple_scores"
  ON couple_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "auth_update_couple_scores" ON couple_scores;
CREATE POLICY "auth_update_couple_scores"
  ON couple_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- couples
DROP POLICY IF EXISTS "auth_delete_couples" ON couples;
CREATE POLICY "auth_delete_couples"
  ON couples
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "auth_insert_couples" ON couples;
CREATE POLICY "auth_insert_couples"
  ON couples
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "auth_update_couples" ON couples;
CREATE POLICY "auth_update_couples"
  ON couples
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

DROP POLICY IF EXISTS "consolidated_manage_couples" ON couples;
CREATE POLICY "consolidated_manage_couples"
  ON couples
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );