-- Fix remaining unoptimized policies - Batch 3: fivefive tables, gallery_albums, member_feedback

-- fivefive_games - remove duplicate and keep one optimized
DROP POLICY IF EXISTS "Admins can manage 5-5 games" ON fivefive_games;
DROP POLICY IF EXISTS "consolidated_manage_fivefive_games" ON fivefive_games;

CREATE POLICY "consolidated_manage_fivefive_games"
  ON fivefive_games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- fivefive_participants
DROP POLICY IF EXISTS "Admins can manage 5-5 participants" ON fivefive_participants;

CREATE POLICY "Admins can manage 5-5 participants"
  ON fivefive_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- fivefive_prizes
DROP POLICY IF EXISTS "Admins can manage prizes" ON fivefive_prizes;

CREATE POLICY "Admins can manage prizes"
  ON fivefive_prizes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- gallery_albums
DROP POLICY IF EXISTS "Admin and permitted members can create albums" ON gallery_albums;

CREATE POLICY "Admin and permitted members can create albums"
  ON gallery_albums
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- member_feedback
DROP POLICY IF EXISTS "Admins can manage feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can create feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can view own feedback" ON member_feedback;

CREATE POLICY "Admins can manage feedback"
  ON member_feedback
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Members can create feedback"
  ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Members can view own feedback"
  ON member_feedback
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );