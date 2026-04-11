-- Add DELETE policy for gallery_albums for permitted members
DROP POLICY IF EXISTS "Permitted members can delete albums" ON gallery_albums;

CREATE POLICY "Permitted members can delete albums"
ON gallery_albums
FOR DELETE
TO authenticated
USING (
  is_current_user_admin()
  OR
  (EXISTS (
    SELECT 1
    FROM gallery_permissions gp
    JOIN members m ON m.id = gp.member_id
    WHERE m.user_id = (SELECT auth.uid())
      AND gp.can_delete_albums = true
  ))
);