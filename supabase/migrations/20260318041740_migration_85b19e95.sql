-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Members can view their created rooms or public lobbies" ON chat_rooms;

-- Create new policy that allows members to see rooms where they are participants
CREATE POLICY "Members can view rooms where they participate"
ON chat_rooms
FOR SELECT
USING (
  -- Can see public lobby rooms
  (type = 'lobby' AND is_public = true)
  OR
  -- Can see rooms they created
  created_by IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
  OR
  -- Can see rooms where they are a non-banned participant
  id IN (
    SELECT cp.room_id 
    FROM chat_participants cp
    INNER JOIN members m ON cp.member_id = m.id
    WHERE m.user_id = auth.uid()
    AND cp.is_banned = false
  )
);