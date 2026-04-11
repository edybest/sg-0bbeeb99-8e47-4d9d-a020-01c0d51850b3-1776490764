-- Fix gallery_albums with correct schema (no can_upload column - just check if user has any permission)
DROP POLICY IF EXISTS "Admin and permitted members can create albums" ON gallery_albums;

CREATE POLICY "Admin and permitted members can create albums" ON gallery_albums
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM gallery_permissions gp
      JOIN members m ON m.id = gp.member_id
      WHERE m.user_id = (SELECT auth.uid())
    )
  );