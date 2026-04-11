-- Fix fivefive_prizes: Split ALL into separate policies
DROP POLICY IF EXISTS "Admins can manage prizes" ON fivefive_prizes;

CREATE POLICY "Admins can insert prizes" ON fivefive_prizes
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update prizes" ON fivefive_prizes
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete prizes" ON fivefive_prizes
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view FiveFive prize configurations" as the only SELECT policy