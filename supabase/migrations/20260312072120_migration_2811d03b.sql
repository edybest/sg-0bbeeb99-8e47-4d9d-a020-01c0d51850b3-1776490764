-- Allow authenticated members to insert their own spin result (RLS)
-- This matches app behavior: saveSpinResult(gameId, member.id, lane)
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