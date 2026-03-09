-- Fix club_settings RLS policies
DROP POLICY IF EXISTS "Admins can manage club settings" ON club_settings;
DROP POLICY IF EXISTS "Anyone can view club settings" ON club_settings;

CREATE POLICY "Admin full access to club_settings"
  ON club_settings
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view club_settings"
  ON club_settings
  FOR SELECT
  TO public
  USING (true);