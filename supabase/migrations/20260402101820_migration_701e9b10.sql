-- Fix admin delete by making UPDATE policy more permissive for admins
DROP POLICY IF EXISTS "admin_update_comments" ON game_comments;

CREATE POLICY "admin_update_comments" 
ON game_comments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true
  )
);