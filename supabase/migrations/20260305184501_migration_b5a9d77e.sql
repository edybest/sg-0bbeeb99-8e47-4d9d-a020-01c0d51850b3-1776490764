-- Drop existing policies for club_settings
DROP POLICY IF EXISTS "Admins can manage club settings" ON club_settings;
DROP POLICY IF EXISTS "Anyone can view club settings" ON club_settings;