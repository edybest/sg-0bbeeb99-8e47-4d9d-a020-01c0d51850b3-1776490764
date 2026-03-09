-- Drop old RLS policies on members table
DROP POLICY IF EXISTS "Members can view their own profile" ON members;
DROP POLICY IF EXISTS "Members can view all profiles" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;

-- Create new optimized RLS policies using get_current_member_id()
CREATE POLICY "members_select_policy" ON members
  FOR SELECT
  USING (true); -- Everyone can view all profiles

CREATE POLICY "members_update_policy" ON members
  FOR UPDATE
  USING (id = get_current_member_id()); -- Can only update own profile

CREATE POLICY "members_admin_all" ON members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );