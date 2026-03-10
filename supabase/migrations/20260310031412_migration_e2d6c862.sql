-- CRITICAL FIX: Remove ALL duplicate and vulnerable policies from members table
DROP POLICY IF EXISTS "members_update_policy" ON members;
DROP POLICY IF EXISTS "members_admin_all" ON members;
DROP POLICY IF EXISTS "members_select_policy" ON members;
DROP POLICY IF EXISTS "Members are viewable by everyone" ON members;

-- Verify remaining policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'members'
ORDER BY policyname;