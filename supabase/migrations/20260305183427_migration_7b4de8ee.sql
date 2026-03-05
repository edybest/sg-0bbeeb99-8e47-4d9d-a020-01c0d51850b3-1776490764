-- Create club_settings table for storing club configuration
CREATE TABLE IF NOT EXISTS club_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view club settings"
  ON club_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage club settings"
  ON club_settings FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Insert default logo setting
INSERT INTO club_settings (setting_key, setting_value)
VALUES ('club_logo_url', '/ambc-logo.png')
ON CONFLICT (setting_key) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_club_settings_key ON club_settings(setting_key);