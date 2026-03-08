-- Fix 4: Optimize game-related table policies

-- ============================================
-- GAME_PLAYERS - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage game players" ON game_players;

CREATE POLICY "Admins can manage game players"
  ON game_players
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- GAMES - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage games" ON games;

CREATE POLICY "Admins can manage games"
  ON games
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- LANE_ASSIGNMENTS - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage lane assignments" ON lane_assignments;

CREATE POLICY "Admins can manage lane assignments"
  ON lane_assignments
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- LANE_CONFIGURATIONS - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage lane configurations" ON lane_configurations;

CREATE POLICY "Admins can manage lane configurations"
  ON lane_configurations
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- PROFILES - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can manage their own profile"
  ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);