-- Add policy to allow members to be added to direct chats by any member
CREATE POLICY "Members can be added to direct chats"
ON chat_participants
FOR INSERT
WITH CHECK (
  -- Allow if it's a direct chat (type = 'direct')
  room_id IN (
    SELECT id FROM chat_rooms WHERE type = 'direct'
  )
);