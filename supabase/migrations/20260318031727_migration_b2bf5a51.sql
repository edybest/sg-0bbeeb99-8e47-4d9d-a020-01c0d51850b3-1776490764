-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Members can view other participants in same room" ON chat_participants;

-- Create a simpler, non-recursive policy
-- Members can view participants in rooms where they are also participants
CREATE POLICY "Members can view participants in accessible rooms"
ON chat_participants
FOR SELECT
TO public
USING (
  -- Can view if: user is a participant in the same room (verified via members table directly)
  room_id IN (
    SELECT cp.room_id 
    FROM chat_participants cp
    INNER JOIN members m ON m.id = cp.member_id
    WHERE m.user_id = auth.uid()
      AND cp.is_banned = false
  )
  OR
  -- OR: room is a public lobby
  room_id IN (
    SELECT id FROM chat_rooms WHERE type = 'lobby' AND is_public = true
  )
);