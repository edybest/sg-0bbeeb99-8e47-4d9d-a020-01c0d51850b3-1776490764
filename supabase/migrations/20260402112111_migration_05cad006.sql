DROP POLICY IF EXISTS "admin_manage_comments" ON game_comments;
DROP POLICY IF EXISTS "members_delete_own_comments" ON game_comments;
DROP POLICY IF EXISTS "members_edit_own_comments" ON game_comments;
DROP POLICY IF EXISTS "admin_update_comments" ON game_comments;

CREATE POLICY "update_comments_admin_or_owner"
ON game_comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.user_id = auth.uid()
      AND (m.is_admin = true OR m.id = game_comments.member_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.user_id = auth.uid()
      AND (m.is_admin = true OR m.id = game_comments.member_id)
  )
);