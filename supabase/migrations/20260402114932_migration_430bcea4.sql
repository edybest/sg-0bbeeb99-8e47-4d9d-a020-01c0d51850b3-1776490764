-- Fix admin/member delete failing due to UPDATE policies being too restrictive (e.g., deleted_at checks).
-- Add a permissive (but safe) UPDATE policy: admin can update any comment; members can update only their own.
-- This covers both edit (comment_text/emoji) and soft-delete (deleted_at/deleted_by).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_comments'
      AND policyname = 'update_own_or_admin'
  ) THEN
    CREATE POLICY "update_own_or_admin"
    ON public.game_comments
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.is_admin = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.id = game_comments.member_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.is_admin = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.id = game_comments.member_id
      )
    );
  END IF;
END $$;