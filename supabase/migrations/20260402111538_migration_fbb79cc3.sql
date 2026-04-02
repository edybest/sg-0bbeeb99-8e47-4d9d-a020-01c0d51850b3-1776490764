ALTER TABLE game_comments
  ADD COLUMN IF NOT EXISTS edited_by uuid;

-- Tambah foreign key (optional tapi bagus untuk konsistensi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_comments_edited_by_fkey'
  ) THEN
    ALTER TABLE game_comments
      ADD CONSTRAINT game_comments_edited_by_fkey
      FOREIGN KEY (edited_by) REFERENCES members(id) ON DELETE SET NULL;
  END IF;
END $$;