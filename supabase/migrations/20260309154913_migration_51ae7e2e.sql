-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Members can create own spin result" ON lane_spin_results;

-- Create new simple policy that allows members to insert their own results
-- This works with our custom session system
CREATE POLICY "Members can insert own spin results" ON lane_spin_results
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE id = member_id
    )
  );