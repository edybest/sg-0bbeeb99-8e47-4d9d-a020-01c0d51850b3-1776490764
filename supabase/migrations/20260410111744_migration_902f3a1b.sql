-- Fix gallery_albums and gallery_images policies with correct schema
-- gallery_permissions doesn't have can_manage column, so use simpler logic

DROP POLICY IF EXISTS "Admin and permitted members can manage albums" ON gallery_albums;
CREATE POLICY "Admin and permitted members can manage albums"
  ON gallery_albums
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin and permitted members can manage images" ON gallery_images;
CREATE POLICY "Admin and permitted members can manage images"
  ON gallery_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = (SELECT auth.uid()) AND m.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON gp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
    )
  );