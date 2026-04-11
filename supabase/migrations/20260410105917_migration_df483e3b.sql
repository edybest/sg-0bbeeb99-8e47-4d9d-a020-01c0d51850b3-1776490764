-- COMPREHENSIVE CLEANUP: Drop all remaining duplicate indexes
-- Strategy: Keep UNIQUE constraints (_key suffix), drop regular indexes
-- For non-constraint duplicates, keep the most descriptive name

-- 1. chat_messages duplicates
DROP INDEX IF EXISTS idx_chat_messages_created;           -- Keep: idx_chat_messages_room_not_deleted (more descriptive)
DROP INDEX IF EXISTS idx_chat_messages_room;               -- Keep: idx_chat_messages_not_deleted (more descriptive)

-- 2. chat_participants duplicates (3 duplicates - keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_chat_participants_member_not_banned;
DROP INDEX IF EXISTS idx_chat_participants_room_member;    -- Keep: chat_participants_room_id_member_id_key (UNIQUE constraint)

-- 3. club_settings duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_club_settings_key;                -- Keep: club_settings_setting_key_key (UNIQUE constraint)

-- 4. couple_scores duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_couple_scores_couple_game;        -- Keep: couple_scores_couple_id_game_id_key (UNIQUE constraint)

-- 5. fivefive_participants duplicates
DROP INDEX IF EXISTS idx_fivefive_participants_game;       -- Keep: idx_fivefive_participants_game_id
DROP INDEX IF EXISTS idx_fivefive_participants_member;     -- Keep: idx_fivefive_participants_member_id

-- 6. gallery_images duplicates
DROP INDEX IF EXISTS idx_gallery_images_order;             -- Keep: idx_gallery_images_album_position (more descriptive)

-- 7. gallery_permissions duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_gallery_permissions_member;       -- Keep: gallery_permissions_member_id_key (UNIQUE constraint)

-- 8. game_comments duplicates
DROP INDEX IF EXISTS idx_game_comments_game_active;        -- Keep: idx_game_comments_game_created (more descriptive)

-- 9. game_players duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_game_players_composite;           -- Keep: game_players_game_id_member_id_key (UNIQUE constraint)

-- 10-12. lane_assignments duplicates (3 sets)
DROP INDEX IF EXISTS idx_lane_assignments_composite;       -- Keep: lane_assignments_game_member_unique (UNIQUE constraint)
DROP INDEX IF EXISTS idx_lane_assignments_game;            -- Keep: idx_lane_assignments_game_id
DROP INDEX IF EXISTS idx_lane_assignments_member;          -- Keep: idx_lane_assignments_member_id

-- 13. lane_spin_results duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_lane_spin_results_composite;      -- Keep: lane_spin_results_game_member_unique (UNIQUE constraint)

-- 14. member_sessions duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_member_sessions_token;            -- Keep: member_sessions_session_token_key (UNIQUE constraint)

-- 15. members duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_members_username;                 -- Keep: members_username_key (UNIQUE constraint)

-- 16. mini_blok_shares duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_mini_blok_shares_token;           -- Keep: mini_blok_shares_token_key (UNIQUE constraint)

-- 17. notification_recipients duplicates
DROP INDEX IF EXISTS idx_notification_recipients_unread;   -- Keep: idx_notification_recipients_unread_member (more descriptive)

-- 18. page_access_control duplicates (keep UNIQUE constraint)
DROP INDEX IF EXISTS idx_page_access_path;                 -- Keep: page_access_control_page_path_key (UNIQUE constraint)

-- 19. training_scores duplicates
DROP INDEX IF EXISTS idx_training_scores_member;           -- Keep: idx_training_scores_member_id