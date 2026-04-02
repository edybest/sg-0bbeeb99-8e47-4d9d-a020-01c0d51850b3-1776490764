-- Add policy untuk members delete own comments
CREATE POLICY "members_delete_own_comments" 
ON game_comments 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
) 
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);