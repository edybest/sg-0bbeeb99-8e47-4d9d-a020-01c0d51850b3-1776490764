-- CLEANUP: Drop all duplicate indexes, keeping only one from each set
-- For each duplicate set, we'll keep the first one alphabetically and drop the rest

-- chat_messages duplicates
DROP INDEX IF EXISTS idx_chat_messages_room;
DROP INDEX IF EXISTS idx_chat_messages_sender;

-- comment_bans duplicates  
DROP INDEX IF EXISTS idx_comment_bans_member;

-- couple_reactions_log duplicates
DROP INDEX IF EXISTS idx_couple_reactions_couple;
DROP INDEX IF EXISTS idx_couple_reactions_member;

-- couple_scores duplicates
DROP INDEX IF EXISTS idx_couple_scores_couple;

-- couples duplicates
DROP INDEX IF EXISTS idx_couples_event;

-- feedback duplicates
DROP INDEX IF EXISTS idx_member_feedback_member;

-- fivefive_participants duplicates
DROP INDEX IF EXISTS idx_fivefive_participants_game;

-- fivefive_player_scores duplicates
DROP INDEX IF EXISTS idx_fivefive_player_scores_participant;

-- gallery_images duplicates
DROP INDEX IF EXISTS idx_gallery_images_uploaded_by;

-- game_comments duplicates
DROP INDEX IF EXISTS idx_game_comments_game;
DROP INDEX IF EXISTS idx_game_comments_member;

-- game_players duplicates
DROP INDEX IF EXISTS idx_game_players_game;
DROP INDEX IF EXISTS idx_game_players_member;

-- lane_assignments duplicates
DROP INDEX IF EXISTS idx_lane_assignments_lane;
DROP INDEX IF EXISTS idx_lane_assignments_member;

-- lane_spin_results duplicates
DROP INDEX IF EXISTS idx_lane_spin_results_member;

-- live_game_comments duplicates
DROP INDEX IF EXISTS idx_live_game_comments_game;
DROP INDEX IF EXISTS idx_live_game_comments_member;

-- live_game_viewers duplicates
DROP INDEX IF EXISTS idx_live_game_viewers_game;
DROP INDEX IF EXISTS idx_live_game_viewers_member;

-- mini_blok_collaborators duplicates
DROP INDEX IF EXISTS idx_mini_blok_collaborators_member;
DROP INDEX IF EXISTS idx_mini_blok_collaborators_mini_blok;

-- mini_blok_players duplicates
DROP INDEX IF EXISTS idx_mini_blok_players_member;
DROP INDEX IF EXISTS idx_mini_blok_players_mini_blok;

-- mini_blok_rounds duplicates
DROP INDEX IF EXISTS idx_mini_blok_rounds_mini_blok;

-- mini_blok_scores duplicates
DROP INDEX IF EXISTS idx_mini_blok_scores_player;
DROP INDEX IF EXISTS idx_mini_blok_scores_round;

-- mini_bloks duplicates
DROP INDEX IF EXISTS idx_mini_bloks_created_by;

-- player_reactions_log duplicates
DROP INDEX IF EXISTS idx_player_reactions_game;
DROP INDEX IF EXISTS idx_player_reactions_member;

-- session_participants duplicates
DROP INDEX IF EXISTS idx_session_participants_member;
DROP INDEX IF EXISTS idx_session_participants_session;

-- training_sessions duplicates
DROP INDEX IF EXISTS idx_training_sessions_created_by;