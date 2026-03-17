-- Step 6: RLS Policies for chat_rooms
-- Anyone can view public lobby rooms
CREATE POLICY "Anyone can view public lobby rooms"
ON chat_rooms FOR SELECT
TO public
USING (type = 'lobby' AND is_public = true);

-- Members can view rooms they participate in (not banned)
CREATE POLICY "Members can view their rooms"
ON chat_rooms FOR SELECT
TO public
USING (
  id IN (
    SELECT room_id FROM chat_participants
    WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      AND is_banned = false
  )
);

-- Authenticated members can create rooms
CREATE POLICY "Members can create rooms"
ON chat_rooms FOR INSERT
TO public
WITH CHECK (
  created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- Room creators and admins can update rooms
CREATE POLICY "Creators and admins can update rooms"
ON chat_rooms FOR UPDATE
TO public
USING (
  created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);