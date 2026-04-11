-- Add INSERT policy for gallery_images for permitted members
DROP POLICY IF EXISTS "Permitted members can add images" ON gallery_images;

CREATE POLICY "Permitted members can add images"
ON gallery_images
FOR INSERT
TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR
  (EXISTS (
    SELECT 1
    FROM gallery_permissions gp
    JOIN members m ON m.id = gp.member_id
    WHERE m.user_id = (SELECT auth.uid())
      AND gp.can_add_images = true
  ))
);