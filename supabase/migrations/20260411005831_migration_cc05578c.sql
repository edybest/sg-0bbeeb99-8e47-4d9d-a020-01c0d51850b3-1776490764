-- Remove all old unoptimized policies - Batch 5 (Final): misc tables

-- player_reactions_log
DROP POLICY IF EXISTS "auth_insert_player_reactions" ON player_reactions_log;

-- lane_assignments
DROP POLICY IF EXISTS "manage_lane_assignments" ON lane_assignments;

-- lane_spin_results
DROP POLICY IF EXISTS "Members can insert own lane spin results" ON lane_spin_results;

-- couple_reactions_log
DROP POLICY IF EXISTS "auth_insert_couple_reactions" ON couple_reactions_log;

-- profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;