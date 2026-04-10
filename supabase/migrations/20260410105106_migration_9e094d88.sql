-- PERFORMANCE FIX 7: Consolidate multiple permissive policies - members
-- Currently has 1 ALL + 1 UPDATE policy, keep them separate but optimize

-- Keep these as they serve different purposes:
-- "Admin full access to members" - for admin operations
-- "Members can update own profile" - for self-service

-- No changes needed here, but let's optimize training_scores which has 3 SELECT policies
DROP POLICY IF EXISTS "Anyone can view training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can view own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can view all training scores" ON training_scores;

CREATE POLICY "view_training_scores" 
  ON training_scores 
  FOR SELECT 
  TO public
  USING (true);  -- Public read access as originally intended