-- Add policy to allow members to join group chat rooms (including lobby)
CREATE POLICY "Members can join group chat rooms"
ON chat_participants
FOR INSERT
WITH CHECK (
  room_id IN (
    SELECT id FROM chat_rooms WHERE type = 'group'
  )
);