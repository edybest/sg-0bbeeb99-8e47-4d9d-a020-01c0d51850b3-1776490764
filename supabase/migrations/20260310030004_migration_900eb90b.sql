-- Fix members table RLS - Remove recursion by using SECURITY DEFINER function
DROP POLICY IF EXISTS "Admin full access to members" ON members;
DROP POLICY IF EXISTS "Members can view all members" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;

-- Allow anyone to view members (public read)
CREATE POLICY "Anyone can view members"
  ON members
  FOR SELECT
  TO public
  USING (true);

-- Members can update their own profile
CREATE POLICY "Members can update own profile"
  ON members
  FOR UPDATE
  TO public
  USING (id = get_current_member_id())
  WITH CHECK (id = get_current_member_id());

-- Admins can do everything
CREATE POLICY "Admin full access to members"
  ON members
  FOR ALL
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());