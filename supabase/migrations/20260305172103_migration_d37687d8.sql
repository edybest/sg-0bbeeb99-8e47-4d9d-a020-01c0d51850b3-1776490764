-- Update RLS policies for members table
CREATE POLICY "Users can view own profile" ON members
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON members
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all members" ON members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );