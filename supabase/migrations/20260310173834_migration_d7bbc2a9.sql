-- Fix training_scores RLS policies to allow members to manage their own scores

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Members can view own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can view training scores" ON training_scores;

-- Create comprehensive policies for members
CREATE POLICY "Members can view own training scores"
  ON training_scores
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

CREATE POLICY "Members can insert own training scores"
  ON training_scores
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

CREATE POLICY "Members can update own training scores"
  ON training_scores
  FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

CREATE POLICY "Members can delete own training scores"
  ON training_scores
  FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

-- Admin policies remain unchanged (already have full access)