-- Clean up DUPLICATE policies on members table
DROP POLICY IF EXISTS "Users can create their own member profile" ON members;
DROP POLICY IF EXISTS "Users can update own profile" ON members;

-- Keep only the new policies that use get_current_member_id()