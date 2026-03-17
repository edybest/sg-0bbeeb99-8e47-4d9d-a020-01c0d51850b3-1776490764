-- Step 8: RLS Policies for chat_messages
-- Members can view messages in rooms they participate in (not banned)
CREATE POLICY "Members can view messages in their rooms"
ON chat_messages FOR SELECT
TO public
USING (
  room_id IN (
    SELECT room_id FROM chat_participants
    WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      AND is_banned = false
  )
  AND deleted_at IS NULL
);

-- Participants can send messages (if not silenced or banned)
CREATE POLICY "Participants can send messages"
ON chat_messages FOR INSERT
TO public
WITH CHECK (
  sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  AND room_id IN (
    SELECT room_id FROM chat_participants
    WHERE member_id = chat_messages.sender_id
      AND is_banned = false
      AND is_silenced = false
  )
);

-- Senders can update their own messages (edit)
CREATE POLICY "Senders can edit own messages"
ON chat_messages FOR UPDATE
TO public
USING (
  sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  AND deleted_at IS NULL
);

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete own messages"
ON chat_messages FOR UPDATE
TO public
USING (
  sender_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- Admins can delete any message
CREATE POLICY "Admins can delete any message"
ON chat_messages FOR UPDATE
TO public
USING (
  EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);