-- Step 4: For chat_participants: Use DIRECT checks only (NO subquery to chat_rooms or chat_participants)

CREATE POLICY "Members can view their own participation records"
  ON chat_participants FOR SELECT
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert participation"
  ON chat_participants FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update their participation"
  ON chat_participants FOR UPDATE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete their participation"
  ON chat_participants FOR DELETE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );