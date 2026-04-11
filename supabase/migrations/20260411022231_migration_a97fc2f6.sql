-- Consolidate mini_blok_collaborators INSERT policies
DROP POLICY IF EXISTS "Restricted insert collaborators" ON mini_blok_collaborators;
DROP POLICY IF EXISTS "optimized_insert_mini_blok_collaborators" ON mini_blok_collaborators;

CREATE POLICY "insert_mini_blok_collaborators" ON mini_blok_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can add any collaborator
    is_current_user_admin()
    OR
    -- Owner can add collaborators to their mini-bloks
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );