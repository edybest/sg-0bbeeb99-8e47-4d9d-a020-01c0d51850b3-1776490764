CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mini_blok_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_blok_id uuid NOT NULL REFERENCES public.mini_blok(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  expires_at timestamptz NULL,
  last_accessed_at timestamptz NULL
);

ALTER TABLE public.mini_blok_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mini_blok_shares_mini_blok_id ON public.mini_blok_shares(mini_blok_id);
CREATE INDEX IF NOT EXISTS idx_mini_blok_shares_token ON public.mini_blok_shares(token);
CREATE INDEX IF NOT EXISTS idx_mini_blok_shares_created_by ON public.mini_blok_shares(created_by_member_id);

DROP POLICY IF EXISTS "Anyone can view mini blok shares" ON public.mini_blok_shares;

CREATE POLICY "Public can read mini_blok_shares token metadata" ON public.mini_blok_shares
FOR SELECT
TO public
USING (revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Members can create shares for mini blok they own or collaborate" ON public.mini_blok_shares
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.mini_blok mb
    WHERE mb.id = mini_blok_id
      AND (
        mb.owner_id = (
          SELECT m.id FROM public.members m WHERE m.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.mini_blok_collaborators c
          JOIN public.members m2 ON m2.id = c.member_id
          WHERE c.mini_blok_id = mb.id
            AND m2.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Members can revoke their own shares" ON public.mini_blok_shares
FOR UPDATE
TO authenticated
USING (
  created_by_member_id = (SELECT m.id FROM public.members m WHERE m.user_id = auth.uid())
)
WITH CHECK (
  created_by_member_id = (SELECT m.id FROM public.members m WHERE m.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.get_mini_blok_shared(p_token text)
RETURNS TABLE (
  mini_blok_id uuid,
  title text,
  location text,
  date date,
  owner_id uuid,
  num_games integer,
  created_at timestamptz,
  updated_at timestamptz,
  players jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_share record;
BEGIN
  SELECT s.*
  INTO v_share
  FROM public.mini_blok_shares s
  WHERE s.token = p_token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1;

  IF v_share.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  UPDATE public.mini_blok_shares
  SET last_accessed_at = now()
  WHERE id = v_share.id;

  RETURN QUERY
  SELECT
    mb.id,
    mb.title,
    mb.location,
    mb.date,
    mb.owner_id,
    mb.num_games,
    mb.created_at,
    mb.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'player_name', p.player_name,
            'handicap', p.handicap,
            'scores', p.scores,
            'created_at', p.created_at,
            'updated_at', p.updated_at
          )
          ORDER BY p.created_at ASC
        )
        FROM public.mini_blok_players p
        WHERE p.mini_blok_id = mb.id
      ),
      '[]'::jsonb
    ) AS players
  FROM public.mini_blok mb
  WHERE mb.id = v_share.mini_blok_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_mini_blok_shared(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mini_blok_shared(text) TO anon, authenticated;