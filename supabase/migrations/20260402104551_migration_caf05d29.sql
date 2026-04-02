-- Add column untuk track edited comments
ALTER TABLE game_comments 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policy untuk members edit own comments
CREATE POLICY "members_edit_own_comments" 
ON game_comments 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
  AND deleted_at IS NULL
) 
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
  AND deleted_at IS NULL
);