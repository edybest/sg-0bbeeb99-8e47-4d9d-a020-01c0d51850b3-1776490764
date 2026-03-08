-- Fix 2: Consolidate and optimize RLS policies
-- Remove duplicate SELECT policies and optimize auth.uid() evaluation

-- ============================================
-- GAME_PLAYERS TABLE - Remove duplicate SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Anyone can view game_players" ON game_players;

-- ============================================
-- MEMBERS TABLE - Consolidate SELECT policies
-- ============================================
-- Drop individual SELECT policies
DROP POLICY IF EXISTS "Anyone can view members for lookup" ON members;
DROP POLICY IF EXISTS "Users can view own profile" ON members;

-- Create single optimized SELECT policy
CREATE POLICY "Members are viewable by everyone"
  ON members FOR SELECT
  USING (true);

-- Drop and recreate INSERT policy with optimization
DROP POLICY IF EXISTS "Users can create their own member profile" ON members;
CREATE POLICY "Users can create their own member profile"
  ON members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate UPDATE policy with optimization  
DROP POLICY IF EXISTS "Users can update own profile" ON members;
CREATE POLICY "Users can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRAINING_SCORES TABLE - Consolidate policies
-- ============================================
-- Drop individual member policies
DROP POLICY IF EXISTS "Members can view own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can insert own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can update own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can delete own training scores" ON training_scores;

-- Create optimized combined policy for members
CREATE POLICY "Members can manage their own training scores"
  ON training_scores
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = training_scores.member_id 
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = training_scores.member_id 
      AND members.user_id = auth.uid()
    )
  );