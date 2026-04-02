-- Drop existing INSERT policy
DROP POLICY IF EXISTS "auth_insert_comments" ON game_comments;

-- Create simplified INSERT policy that only checks member_id matches authenticated user
CREATE POLICY "auth_insert_comments" 
ON game_comments 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);