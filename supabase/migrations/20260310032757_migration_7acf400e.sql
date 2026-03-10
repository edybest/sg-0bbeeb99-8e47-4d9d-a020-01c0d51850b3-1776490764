-- Update members table RLS to use unified auth
DROP POLICY IF EXISTS "Anyone can view members" ON members;
DROP POLICY IF EXISTS "Admin full access to members" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;

CREATE POLICY "Anyone can view members"
  ON members
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin full access to members"
  ON members
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO public
  USING (id = get_current_member_id_unified())
  WITH CHECK (id = get_current_member_id_unified());