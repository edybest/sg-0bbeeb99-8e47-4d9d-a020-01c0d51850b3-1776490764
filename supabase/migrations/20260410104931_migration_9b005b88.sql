-- PERFORMANCE FIX 2: Consolidate multiple permissive policies - game_comments
-- Currently has 3 UPDATE policies, consolidate into 1

DROP POLICY IF EXISTS "update_comments" ON game_comments;
DROP POLICY IF EXISTS "update_own_or_admin" ON game_comments;
DROP POLICY IF EXISTS "update_comments_policy" ON game_comments;

CREATE POLICY "manage_comments" 
  ON game_comments 
  FOR UPDATE 
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = auth.uid() 
      AND (m.is_admin = true OR member_id = m.id)
    )
  );