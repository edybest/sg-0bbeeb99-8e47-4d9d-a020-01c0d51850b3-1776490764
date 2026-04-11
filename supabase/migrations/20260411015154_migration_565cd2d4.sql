-- Fix fivefive_participants: Remove duplicate ALL policy
DROP POLICY IF EXISTS "Admins can manage 5-5 participants" ON fivefive_participants;

-- Split "Admin full access to fivefive_participants" into INSERT/UPDATE/DELETE only
DROP POLICY IF EXISTS "Admin full access to fivefive_participants" ON fivefive_participants;

CREATE POLICY "Admins can insert fivefive_participants" ON fivefive_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update fivefive_participants" ON fivefive_participants
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete fivefive_participants" ON fivefive_participants
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Keep "Anyone can view fivefive_participants" as the only SELECT policy