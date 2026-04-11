-- Continue fixing remaining RLS policies - Batch 7

-- member_feedback
DROP POLICY IF EXISTS "Members can submit feedback" ON member_feedback;
CREATE POLICY "Members can submit feedback"
  ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "view_feedback" ON member_feedback;
CREATE POLICY "view_feedback"
  ON member_feedback
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- members
DROP POLICY IF EXISTS "Members can update own profile" ON members;
CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- mini_blok
DROP POLICY IF EXISTS "auth_insert_mini_blok" ON mini_blok;
CREATE POLICY "auth_insert_mini_blok"
  ON mini_blok
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );