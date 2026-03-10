-- CORRECT FIX: Restrict both SELECT and UPDATE to own profile only
DROP POLICY IF EXISTS "Members can update own profile" ON members;

CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO public
  USING (id = get_current_member_id())  -- Can only SEE own row
  WITH CHECK (id = get_current_member_id());  -- Can only UPDATE own row