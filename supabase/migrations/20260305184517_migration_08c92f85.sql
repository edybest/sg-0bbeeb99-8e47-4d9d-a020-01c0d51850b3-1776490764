-- Create new RLS policies for club_settings with proper admin check
CREATE POLICY "Anyone can view club settings"
ON club_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert club settings"
ON club_settings
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true
  )
);

CREATE POLICY "Admins can update club settings"
ON club_settings
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true
  )
);

CREATE POLICY "Admins can delete club settings"
ON club_settings
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true
  )
);