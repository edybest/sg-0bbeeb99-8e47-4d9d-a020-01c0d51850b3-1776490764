CREATE TABLE IF NOT EXISTS public.blok_join_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  member_id uuid NULL REFERENCES public.members(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  queue_position integer NOT NULL CHECK (queue_position > 0),
  queue_group text NOT NULL CHECK (queue_group IN ('main', 'waiting')),
  source_type text NOT NULL DEFAULT 'join_request' CHECK (source_type IN ('admin_import', 'join_request')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blok_join_queue_game_position_key
  ON public.blok_join_queue (game_id, queue_position);

CREATE UNIQUE INDEX IF NOT EXISTS blok_join_queue_game_member_unique
  ON public.blok_join_queue (game_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blok_join_queue_game_lookup
  ON public.blok_join_queue (game_id, queue_position);

ALTER TABLE public.blok_join_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view blok_join_queue" ON public.blok_join_queue;
CREATE POLICY "Anyone can view blok_join_queue"
ON public.blok_join_queue
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert blok_join_queue" ON public.blok_join_queue;
CREATE POLICY "Admins can insert blok_join_queue"
ON public.blok_join_queue
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update blok_join_queue" ON public.blok_join_queue;
CREATE POLICY "Admins can update blok_join_queue"
ON public.blok_join_queue
FOR UPDATE
TO authenticated
USING (is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete blok_join_queue" ON public.blok_join_queue;
CREATE POLICY "Admins can delete blok_join_queue"
ON public.blok_join_queue
FOR DELETE
TO authenticated
USING (is_current_user_admin());