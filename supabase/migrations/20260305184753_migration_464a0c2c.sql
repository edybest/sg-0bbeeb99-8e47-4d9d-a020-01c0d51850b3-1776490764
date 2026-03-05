-- Create RLS policies using existing is_admin() function
-- Note: The existing function uses parameter name 'user_uuid'

-- Public read access (for displaying logo to all users)
CREATE POLICY "Anyone can view club settings"
ON club_settings FOR SELECT
USING (true);

-- Admin insert access
CREATE POLICY "Admins can insert club settings"
ON club_settings FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admin update access
CREATE POLICY "Admins can update club settings"
ON club_settings FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin delete access
CREATE POLICY "Admins can delete club settings"
ON club_settings FOR DELETE
USING (is_admin(auth.uid()));