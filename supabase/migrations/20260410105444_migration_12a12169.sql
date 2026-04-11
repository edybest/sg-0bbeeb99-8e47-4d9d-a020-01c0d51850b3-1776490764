-- OPTIMIZATION 2: Drop specific duplicate indexes identified by linter
-- Keep the automatically created foreign key indexes, drop manual duplicates

DROP INDEX IF EXISTS idx_chat_messages_sender_id;
DROP INDEX IF EXISTS idx_comment_bans_member_id;
DROP INDEX IF EXISTS idx_couple_participants_couple_id;
DROP INDEX IF EXISTS idx_couple_participants_member_id;
DROP INDEX IF EXISTS idx_couple_scores_couple_id;
DROP INDEX IF EXISTS idx_five_five_scores_member_id;
DROP INDEX IF EXISTS idx_game_comments_game_id;
DROP INDEX IF EXISTS idx_game_comments_member_id;
DROP INDEX IF EXISTS idx_game_players_game_id;
DROP INDEX IF EXISTS idx_game_players_member_id;