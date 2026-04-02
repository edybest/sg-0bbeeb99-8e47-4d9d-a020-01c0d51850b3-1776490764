ALTER TABLE game_comments
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id);

-- Pastikan RLS policy untuk edit own comments wujud dan sah
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'game_comments' 
      AND policyname = 'members_edit_own_comments'
  ) THEN
    -- Biarkan (dah wujud)
    NULL;
  ELSE
    CREATE POLICY "members_edit_own_comments" 
    ON game_comments 
    FOR UPDATE 
    USING (
      member_id IN (
        SELECT id FROM members WHERE user_id = auth.uid()
      )
      AND deleted_at IS NULL
    )
    WITH CHECK (
      member_id IN (
        SELECT id FROM members WHERE user_id = auth.uid()
      )
      AND deleted_at IS NULL
    );
  END IF;
END $$;