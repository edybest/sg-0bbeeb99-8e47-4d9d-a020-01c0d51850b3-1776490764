-- PERFORMANCE FIX 5: Consolidate multiple permissive policies - lane_spin_results
-- Currently has 2 SELECT policies, consolidate into 1

DROP POLICY IF EXISTS "Anyone can view lane_spin_results" ON lane_spin_results;
DROP POLICY IF EXISTS "Anyone can view lane spins" ON lane_spin_results;

CREATE POLICY "public_read_lane_spins" 
  ON lane_spin_results 
  FOR SELECT 
  TO public
  USING (true);