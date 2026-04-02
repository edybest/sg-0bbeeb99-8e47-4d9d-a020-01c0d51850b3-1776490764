-- Drop ALL UPDATE-related policies to start fresh
DROP POLICY IF EXISTS "admin_update_comments" ON game_comments;
DROP POLICY IF EXISTS "members_update_own_comments" ON game_comments;
DROP POLICY IF EXISTS "members_delete_own_comments" ON game_comments;
DROP POLICY IF EXISTS "members_edit_own_comments" ON game_comments;
DROP POLICY IF EXISTS "admin_manage_comments" ON game_comments;

-- Create ONE clean UPDATE policy for both edit and delete
CREATE POLICY "update_comments" 
ON game_comments 
FOR UPDATE 
USING (
  -- Can update if: admin OR own comment
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND (m.is_admin = true OR m.id = game_comments.member_id)
  )
)
WITH CHECK (
  -- Same check for new row values
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND (m.is_admin = true OR m.id = game_comments.member_id)
  )
);