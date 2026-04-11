-- Consolidate mini_blok_collaborators DELETE policies
DROP POLICY IF EXISTS "Restricted delete collaborators" ON mini_blok_collaborators;
DROP POLICY IF EXISTS "optimized_delete_mini_blok_collaborators" ON mini_blok_collaborators;

CREATE POLICY "delete_mini_blok_collaborators" ON mini_blok_collaborators
  FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete any collaborator
    is_current_user_admin()
    OR
    -- Owner can delete collaborators from their mini-bloks
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    -- Collaborators can remove themselves
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok_collaborators.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );