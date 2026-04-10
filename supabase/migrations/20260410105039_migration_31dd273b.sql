-- PERFORMANCE FIX 6: Consolidate multiple permissive policies - member_feedback
-- Currently has 2 SELECT policies, consolidate into 1

DROP POLICY IF EXISTS "Admin can view all feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can view own feedback" ON member_feedback;

CREATE POLICY "view_feedback" 
  ON member_feedback 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = auth.uid() 
      AND (m.is_admin = true OR member_id = m.id)
    )
  );