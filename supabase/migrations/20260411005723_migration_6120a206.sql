-- Remove all old unoptimized policies - Batch 1: couples, fivefive_games, blok_games

-- couples - remove 6 old policies, keep only consolidated_manage_couples
DROP POLICY IF EXISTS "Admins can create couples" ON couples;
DROP POLICY IF EXISTS "Admins can delete couples" ON couples;
DROP POLICY IF EXISTS "Admins can update couples" ON couples;
DROP POLICY IF EXISTS "auth_delete_couples" ON couples;
DROP POLICY IF EXISTS "auth_insert_couples" ON couples;
DROP POLICY IF EXISTS "auth_update_couples" ON couples;

-- fivefive_games - remove 6 old policies, keep consolidated_manage_fivefive_games
DROP POLICY IF EXISTS "Admins can create 5-5 games" ON fivefive_games;
DROP POLICY IF EXISTS "Admins can delete 5-5 games" ON fivefive_games;
DROP POLICY IF EXISTS "Admins can update 5-5 games" ON fivefive_games;
DROP POLICY IF EXISTS "auth_delete_fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "auth_insert_fivefive_games" ON fivefive_games;
DROP POLICY IF EXISTS "auth_update_fivefive_games" ON fivefive_games;

-- blok_games - remove 4 old policies
DROP POLICY IF EXISTS "Authenticated users can insert blok games" ON blok_games;
DROP POLICY IF EXISTS "Users can delete their own blok games" ON blok_games;
DROP POLICY IF EXISTS "Users can update their own blok games" ON blok_games;

-- couple_scores - remove 3 old policies, keep consolidated ones
DROP POLICY IF EXISTS "Admins can delete couple scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can insert couple scores" ON couple_scores;
DROP POLICY IF EXISTS "Admins can update couple scores" ON couple_scores;
DROP POLICY IF EXISTS "auth_delete_couple_scores" ON couple_scores;
DROP POLICY IF EXISTS "auth_insert_couple_scores" ON couple_scores;
DROP POLICY IF EXISTS "auth_update_couple_scores" ON couple_scores;