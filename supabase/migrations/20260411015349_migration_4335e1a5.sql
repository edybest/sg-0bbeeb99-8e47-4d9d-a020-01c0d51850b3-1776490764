-- Fix member_feedback: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Admins can manage feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can view own feedback" ON member_feedback;

-- Keep "Admin can update feedback" for UPDATE
-- Add admin INSERT/DELETE policies
CREATE POLICY "Admins can insert member_feedback" ON member_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete member_feedback" ON member_feedback
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Add public SELECT policy (simplest approach)
CREATE POLICY "Anyone can view member_feedback" ON member_feedback
  FOR SELECT
  TO public
  USING (true);

-- Keep "Members can create feedback" for INSERT