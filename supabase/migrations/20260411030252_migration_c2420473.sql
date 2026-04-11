-- Consolidate mini_blok UPDATE policies into ONE policy
-- Drop both existing UPDATE policies
DROP POLICY IF EXISTS "Admins can update mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "owner_collab_update_mini_blok" ON mini_blok;

-- Create single consolidated UPDATE policy
CREATE POLICY "authenticated_update_mini_blok" ON mini_blok
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update any mini_blok
    is_current_user_admin()
    OR
    -- Owner can update their own mini_blok
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok.owner_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    -- Collaborators can update mini_blok
    EXISTS (
      SELECT 1 FROM mini_blok_collaborators mbc
      JOIN members m ON m.id = mbc.member_id
      WHERE mbc.mini_blok_id = mini_blok.id
        AND m.user_id = (SELECT auth.uid())
    )
  );