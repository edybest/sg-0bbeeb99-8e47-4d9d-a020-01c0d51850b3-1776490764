-- Enable member self-write for lane_assignments (fix "failed to save lane assignment")
-- Allow authenticated users to insert/update their own lane assignment row (game_id + member_id unique)

CREATE POLICY "Members can insert their own lane assignment"
ON public.lane_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = lane_assignments.member_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update their own lane assignment"
ON public.lane_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = lane_assignments.member_id
      AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = lane_assignments.member_id
      AND m.user_id = auth.uid()
  )
);