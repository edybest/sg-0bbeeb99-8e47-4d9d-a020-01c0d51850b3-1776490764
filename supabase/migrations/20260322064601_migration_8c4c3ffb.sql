CREATE INDEX IF NOT EXISTS idx_games_type_date
ON public.games (game_type, game_date DESC);

CREATE INDEX IF NOT EXISTS idx_members_is_admin
ON public.members (is_admin);