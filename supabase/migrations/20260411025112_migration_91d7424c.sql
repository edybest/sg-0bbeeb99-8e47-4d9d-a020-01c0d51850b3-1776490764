-- Consolidate members UPDATE policies into ONE policy
-- Combines admin check and own-profile check
DROP POLICY IF EXISTS "Admins can update members" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;

CREATE POLICY "authenticated_update_members" ON members
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update any member
    is_current_user_admin()
    OR
    -- Members can update their own profile
    user_id = (SELECT auth.uid())
  );