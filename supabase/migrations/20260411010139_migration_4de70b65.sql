-- Fix remaining unoptimized policies - Batch 2: comment_bans, couple_reactions_log, couple_scores, couples

-- comment_bans
DROP POLICY IF EXISTS "admin_manage_bans" ON comment_bans;

CREATE POLICY "admin_manage_bans"
  ON comment_bans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- couple_reactions_log
DROP POLICY IF EXISTS "auth_insert_couple_reactions_log" ON couple_reactions_log;

CREATE POLICY "auth_insert_couple_reactions_log"
  ON couple_reactions_log
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- couple_scores
DROP POLICY IF EXISTS "Admins can manage couple scores" ON couple_scores;

CREATE POLICY "Admins can manage couple scores"
  ON couple_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- couples - remove the duplicate one and keep only one optimized version
DROP POLICY IF EXISTS "Admins can manage couples" ON couples;
DROP POLICY IF EXISTS "consolidated_manage_couples" ON couples;

CREATE POLICY "consolidated_manage_couples"
  ON couples
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );