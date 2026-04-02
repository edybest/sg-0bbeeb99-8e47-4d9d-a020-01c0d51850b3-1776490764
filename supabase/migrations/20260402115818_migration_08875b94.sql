-- Drop the problematic policy
DROP POLICY IF EXISTS "update_comments_admin_or_owner" ON game_comments;

-- Create simpler policy: USING checks permission, WITH CHECK always allows
CREATE POLICY "update_comments_policy" 
ON game_comments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND (m.is_admin = true OR m.id = game_comments.member_id)
  )
)
WITH CHECK (true);