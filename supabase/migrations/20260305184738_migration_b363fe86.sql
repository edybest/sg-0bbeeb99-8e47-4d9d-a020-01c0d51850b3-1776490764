-- Drop existing club_settings policies first
DROP POLICY IF EXISTS "Anyone can view club settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can insert club settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can update club settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can delete club settings" ON club_settings;