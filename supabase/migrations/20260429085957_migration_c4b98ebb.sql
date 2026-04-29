DROP POLICY IF EXISTS "Members can insert own lane spin results" ON public.lane_spin_results;
CREATE POLICY "Members can insert own lane spin results"
ON public.lane_spin_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = lane_spin_results.member_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can insert own or couple lane assignments" ON public.lane_assignments;
CREATE POLICY "Members can insert own or couple lane assignments"
ON public.lane_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  (
    lane_assignments.member_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = lane_assignments.member_id
        AND m.user_id = auth.uid()
    )
  )
  OR
  (
    lane_assignments.couple_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.couples c
      LEFT JOIN public.members m1 ON m1.id = c.player1_id
      LEFT JOIN public.members m2 ON m2.id = c.player2_id
      WHERE c.id = lane_assignments.couple_id
        AND (m1.user_id = auth.uid() OR m2.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Members can update own or couple lane assignments" ON public.lane_assignments;
CREATE POLICY "Members can update own or couple lane assignments"
ON public.lane_assignments
FOR UPDATE
TO authenticated
USING (
  (
    lane_assignments.member_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = lane_assignments.member_id
        AND m.user_id = auth.uid()
    )
  )
  OR
  (
    lane_assignments.couple_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.couples c
      LEFT JOIN public.members m1 ON m1.id = c.player1_id
      LEFT JOIN public.members m2 ON m2.id = c.player2_id
      WHERE c.id = lane_assignments.couple_id
        AND (m1.user_id = auth.uid() OR m2.user_id = auth.uid())
    )
  )
)
WITH CHECK (
  (
    lane_assignments.member_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = lane_assignments.member_id
        AND m.user_id = auth.uid()
    )
  )
  OR
  (
    lane_assignments.couple_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.couples c
      LEFT JOIN public.members m1 ON m1.id = c.player1_id
      LEFT JOIN public.members m2 ON m2.id = c.player2_id
      WHERE c.id = lane_assignments.couple_id
        AND (m1.user_id = auth.uid() OR m2.user_id = auth.uid())
    )
  )
);