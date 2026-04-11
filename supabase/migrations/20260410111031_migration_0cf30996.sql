-- PERFORMANCE FIX: Add indexes only for existing tables
DO $$ 
BEGIN
  -- Check and create indexes only if table exists
  
  -- chat_messages foreign keys
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_messages') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_messages_deleted_by') THEN
      CREATE INDEX idx_chat_messages_deleted_by ON chat_messages(deleted_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_messages_sender_id') THEN
      CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
    END IF;
  END IF;

  -- chat_participants foreign keys
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_participants') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_participants_banned_by') THEN
      CREATE INDEX idx_chat_participants_banned_by ON chat_participants(banned_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_participants_silenced_by') THEN
      CREATE INDEX idx_chat_participants_silenced_by ON chat_participants(silenced_by);
    END IF;
  END IF;

  -- comment_bans foreign keys
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'comment_bans') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_comment_bans_banned_by') THEN
      CREATE INDEX idx_comment_bans_banned_by ON comment_bans(banned_by);
    END IF;
  END IF;

  -- game_comments foreign keys
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'game_comments') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_game_comments_deleted_by') THEN
      CREATE INDEX idx_game_comments_deleted_by ON game_comments(deleted_by);
    END IF;
  END IF;

  -- member_feedback foreign keys
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'member_feedback') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_member_feedback_replied_by') THEN
      CREATE INDEX idx_member_feedback_replied_by ON member_feedback(replied_by);
    END IF;
  END IF;

  RAISE NOTICE 'Foreign key indexes created for existing tables!';
END $$;