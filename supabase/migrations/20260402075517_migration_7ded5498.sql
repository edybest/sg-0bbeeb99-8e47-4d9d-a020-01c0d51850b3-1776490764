-- Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add UPDATE policy for admin to soft delete comments
CREATE POLICY "admin_update_comments" 
ON game_comments 
FOR UPDATE 
USING (is_admin_user());