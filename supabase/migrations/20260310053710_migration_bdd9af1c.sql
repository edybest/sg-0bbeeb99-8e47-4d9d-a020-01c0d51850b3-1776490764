-- Create page_access_control table
CREATE TABLE IF NOT EXISTS page_access_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_path TEXT NOT NULL UNIQUE, -- e.g., '/member/blok', '/member/profile'
  page_name TEXT NOT NULL, -- Display name e.g., 'Blok Leaderboard', 'Profile'
  access_level TEXT NOT NULL DEFAULT 'member', -- 'public', 'member', 'admin'
  is_enabled BOOLEAN DEFAULT true, -- Allow disabling pages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'member', 'admin'))
);

-- Add comment
COMMENT ON TABLE page_access_control IS 'Access control settings for member pages';
COMMENT ON COLUMN page_access_control.page_path IS 'URL path of the page';
COMMENT ON COLUMN page_access_control.page_name IS 'Human-readable page name';
COMMENT ON COLUMN page_access_control.access_level IS 'Who can access: public (all), member (logged in), admin (admin only)';
COMMENT ON COLUMN page_access_control.is_enabled IS 'Whether the page is accessible';

-- Create index for faster lookups
CREATE INDEX idx_page_access_path ON page_access_control(page_path);

-- Enable RLS
ALTER TABLE page_access_control ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view page access settings"
  ON page_access_control FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to page_access_control"
  ON page_access_control FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Insert default page configurations
INSERT INTO page_access_control (page_path, page_name, access_level, is_enabled) VALUES
  ('/', 'Homepage', 'public', true),
  ('/member', 'Member Dashboard', 'member', true),
  ('/member/blok', 'Blok Leaderboard', 'member', true),
  ('/member/hall-of-fame', 'Hall of Fame', 'public', true),
  ('/member/average-score', 'Average Score', 'member', true),
  ('/member/profile', 'My Profile', 'member', true),
  ('/member/five-five', 'FiveFive Game', 'member', true),
  ('/member/training', 'Training Scores', 'member', true),
  ('/member/lane', 'Lane Assignment', 'member', true),
  ('/member/undi-lane', 'Lane Spin', 'member', true)
ON CONFLICT (page_path) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_page_access_control_updated_at
  BEFORE UPDATE ON page_access_control
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();