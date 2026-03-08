-- Fix 3: Optimize remaining policies with subquery optimization
-- Use EXISTS pattern to reduce auth.uid() re-evaluation

-- ============================================
-- CLUB_SETTINGS - Optimize admin checks
-- ============================================
DROP POLICY IF EXISTS "Admins can insert club settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can update club settings" ON club_settings;
DROP POLICY IF EXISTS "Admins can delete club settings" ON club_settings;

CREATE POLICY "Admins can manage club settings"
  ON club_settings
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- FIVEFIVE_GAMES - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage fivefive games" ON fivefive_games;

CREATE POLICY "Admins can manage fivefive games"
  ON fivefive_games
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- FIVEFIVE_PARTICIPANTS - Optimize policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage fivefive participants" ON fivefive_participants;

CREATE POLICY "Admins can manage fivefive participants"
  ON fivefive_participants
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- FIVEFIVE_PRIZES - Consolidate policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert FiveFive configurations" ON fivefive_prizes;
DROP POLICY IF EXISTS "Authenticated users can update FiveFive configurations" ON fivefive_prizes;
DROP POLICY IF EXISTS "Authenticated users can delete FiveFive configurations" ON fivefive_prizes;

CREATE POLICY "Authenticated users can manage FiveFive configurations"
  ON fivefive_prizes
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);