-- Fix mini_blok_collaborators, mini_blok_players, mini_blok_shares policies
DROP POLICY IF EXISTS "delete_mini_blok_collaborators" ON mini_blok_collaborators;
DROP POLICY IF EXISTS "insert_mini_blok_collaborators" ON mini_blok_collaborators;
DROP POLICY IF EXISTS "auth_update_mini_blok_collaborators" ON mini_blok_collaborators;
DROP POLICY IF EXISTS "auth_delete_mini_blok_players" ON mini_blok_players;
DROP POLICY IF EXISTS "auth_insert_mini_blok_players" ON mini_blok_players;
DROP POLICY IF EXISTS "auth_update_mini_blok_players" ON mini_blok_players;
DROP POLICY IF EXISTS "delete_mini_blok_shares" ON mini_blok_shares;
DROP POLICY IF EXISTS "insert_mini_blok_shares" ON mini_blok_shares;
DROP POLICY IF EXISTS "update_mini_blok_shares" ON mini_blok_shares;

CREATE POLICY "delete_mini_blok_collaborators" ON mini_blok_collaborators
  FOR DELETE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = mini_blok_collaborators.member_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "insert_mini_blok_collaborators" ON mini_blok_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_collaborators.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "auth_update_mini_blok_collaborators" ON mini_blok_collaborators
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "auth_delete_mini_blok_players" ON mini_blok_players
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "auth_insert_mini_blok_players" ON mini_blok_players
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "auth_update_mini_blok_players" ON mini_blok_players
  FOR UPDATE TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "delete_mini_blok_shares" ON mini_blok_shares
  FOR DELETE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "insert_mini_blok_shares" ON mini_blok_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "update_mini_blok_shares" ON mini_blok_shares
  FOR UPDATE TO authenticated
  USING (
    is_current_user_admin()
    OR
    EXISTS (
      SELECT 1 FROM mini_blok mb
      JOIN members m ON m.id = mb.owner_id
      WHERE mb.id = mini_blok_shares.mini_blok_id
        AND m.user_id = (SELECT auth.uid())
    )
  );