-- Temporarily create a more permissive INSERT policy for debugging
-- This will allow us to see if RLS is the actual blocker

DROP POLICY IF EXISTS "auth_insert_comments" ON game_comments;

CREATE POLICY "auth_insert_comments" 
ON game_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);