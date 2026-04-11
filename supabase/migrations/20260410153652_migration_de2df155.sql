-- Fix gallery_images and gallery_albums policies with CORRECT schema
-- gallery_permissions doesn't have album_id - it's a general permission table

-- gallery_albums - simple admin/permitted check
DROP POLICY IF EXISTS "Admin and permitted members can delete albums" ON gallery_albums;
CREATE POLICY "Admin and permitted members can delete albums"
  ON gallery_albums
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND gp.can_delete_albums = true
    )
  );

DROP POLICY IF EXISTS "Admin and permitted members can update albums" ON gallery_albums;
CREATE POLICY "Admin and permitted members can update albums"
  ON gallery_albums
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND gp.can_edit_albums = true
    )
  );

-- gallery_images
DROP POLICY IF EXISTS "Admin and permitted members can delete images" ON gallery_images;
CREATE POLICY "Admin and permitted members can delete images"
  ON gallery_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND gp.can_delete_images = true
    )
  );

DROP POLICY IF EXISTS "Admin and permitted members can update images" ON gallery_images;
CREATE POLICY "Admin and permitted members can update images"
  ON gallery_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND gp.can_edit_images = true
    )
  );