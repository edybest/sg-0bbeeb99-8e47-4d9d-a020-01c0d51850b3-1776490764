-- Fix mini_blok_collaborators INSERT with CORRECT column name (owner_id)
DROP POLICY IF EXISTS "Anyone authenticated can add collaborators" ON mini_blok_collaborators;

CREATE POLICY "Restricted insert collaborators" ON mini_blok_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can add any
    is_current_user_admin()
    OR
    -- Owner of the mini_blok can add collaborators (using owner_id)
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON mb.owner_id = m.id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );