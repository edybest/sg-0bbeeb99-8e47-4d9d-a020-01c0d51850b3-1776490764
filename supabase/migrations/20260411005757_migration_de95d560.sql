-- Remove all old unoptimized policies - Batch 3: training_scores, fivefive_prizes, game tables

-- training_scores - remove old policies
DROP POLICY IF EXISTS "Members can delete own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can insert own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can manage own training scores" ON training_scores;
DROP POLICY IF EXISTS "Members can update own training scores" ON training_scores;

-- fivefive_prizes - remove old policies
DROP POLICY IF EXISTS "Admins can create prizes" ON fivefive_prizes;
DROP POLICY IF EXISTS "Admins can delete prizes" ON fivefive_prizes;
DROP POLICY IF EXISTS "Admins can update prizes" ON fivefive_prizes;
DROP POLICY IF EXISTS "Authenticated users can manage FiveFive configurations" ON fivefive_prizes;

-- game_players - remove old policies
DROP POLICY IF EXISTS "Admins can create game players" ON game_players;
DROP POLICY IF EXISTS "Admins can delete game players" ON game_players;
DROP POLICY IF EXISTS "Admins can update game players" ON game_players;
DROP POLICY IF EXISTS "manage_game_players" ON game_players;

-- game_viewers - remove old policies
DROP POLICY IF EXISTS "auth_delete_game_viewers" ON game_viewers;
DROP POLICY IF EXISTS "auth_insert_game_viewers" ON game_viewers;
DROP POLICY IF EXISTS "auth_update_game_viewers" ON game_viewers;
DROP POLICY IF EXISTS "members_manage_own_presence" ON game_viewers;

-- mini_blok - remove old policies
DROP POLICY IF EXISTS "auth_insert_mini_blok" ON mini_blok;
DROP POLICY IF EXISTS "owner_collab_update" ON mini_blok;
DROP POLICY IF EXISTS "owner_delete_mini_blok" ON mini_blok;

-- push_subscriptions - remove old policies
DROP POLICY IF EXISTS "consolidated_delete_push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "consolidated_insert_push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "consolidated_select_push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "consolidated_update_push_subscriptions" ON push_subscriptions;