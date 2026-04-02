-- Drop both duplicate UPDATE policies
DROP POLICY IF EXISTS "admin_update_comments" ON game_comments;
DROP POLICY IF EXISTS "admin_delete_comments" ON game_comments;

-- Create ONE clean UPDATE policy with proper USING and WITH CHECK
CREATE POLICY "admin_manage_comments" 
ON game_comments 
FOR UPDATE 
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