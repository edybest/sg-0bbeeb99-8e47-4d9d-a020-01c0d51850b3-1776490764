-- Remove duplicate admin policy on members table
DROP POLICY IF EXISTS "Admin full access to members" ON members;

-- Keep only "Admins can manage members" which covers all operations