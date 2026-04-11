-- Fix mini_blok_shares policy with correct column name
DROP POLICY IF EXISTS "Members can revoke their own shares" ON mini_blok_shares;
CREATE POLICY "Members can revoke their own shares"
  ON mini_blok_shares
  FOR DELETE
  TO authenticated
  USING (
    created_by_member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );