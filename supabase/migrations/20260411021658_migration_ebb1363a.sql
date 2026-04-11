-- Fix mini_blok_collaborators DELETE with CORRECT column name (owner_id)
DROP POLICY IF EXISTS "Anyone authenticated can remove collaborators" ON mini_blok_collaborators;

CREATE POLICY "Restricted delete collaborators" ON mini_blok_collaborators
  FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete any
    is_current_user_admin()
    OR
    -- Owner of the mini_blok can delete collaborators (using owner_id)
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
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