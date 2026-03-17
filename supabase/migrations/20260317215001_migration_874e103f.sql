-- Step 7: RLS Policies for chat_participants
-- Members can view participants in rooms they're in (not banned)
CREATE POLICY "Members can view room participants"
ON chat_participants FOR SELECT
TO public
USING (
  room_id IN (
    SELECT room_id FROM chat_participants cp2
    WHERE cp2.member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      AND cp2.is_banned = false
  )
);

-- Room creators can add participants
CREATE POLICY "Room creators can add participants"
ON chat_participants FOR INSERT
TO public
WITH CHECK (
  room_id IN (
    SELECT id FROM chat_rooms
    WHERE created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
);

-- Admins can add anyone to any room
CREATE POLICY "Admins can add participants"
ON chat_participants FOR INSERT
TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Members can update their own participant record (last_read_at)
CREATE POLICY "Members can update own participant record"
ON chat_participants FOR UPDATE
TO public
USING (
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
)
WITH CHECK (
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  -- Only allow updating last_read_at, not ban/silence fields
);

-- Admins can update any participant (for ban/silence)
CREATE POLICY "Admins can manage participants"
ON chat_participants FOR UPDATE
TO public
USING (
  EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);