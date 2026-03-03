-- Also fix game_players and games policies to use the same function
DROP POLICY IF EXISTS "Admins can manage game players" ON public.game_players;
DROP POLICY IF EXISTS "Admins can manage games" ON public.games;

-- Recreate with security definer function
CREATE POLICY "Admins can manage game players"
ON public.game_players
FOR ALL
TO public
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage games"
ON public.games
FOR ALL
TO public
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));