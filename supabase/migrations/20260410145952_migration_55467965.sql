-- SYSTEMATIC FIX: Optimize ALL 93 unoptimized policies - Batch 1 (blok_games, chat_messages, chat_participants, chat_rooms)

-- blok_games
DROP POLICY IF EXISTS "Authenticated users can insert blok games" ON blok_games;
CREATE POLICY "Authenticated users can insert blok games"
  ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete their own blok games" ON blok_games;
CREATE POLICY "Users can delete their own blok games"
  ON blok_games
  FOR DELETE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update their own blok games" ON blok_games;
CREATE POLICY "Users can update their own blok games"
  ON blok_games
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_messages
DROP POLICY IF EXISTS "Members can view messages in accessible rooms" ON chat_messages;
CREATE POLICY "Members can view messages in accessible rooms"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE cp.room_id = chat_messages.room_id
        AND m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
    )
  );

DROP POLICY IF EXISTS "Participants can send messages if not silenced" ON chat_messages;
CREATE POLICY "Participants can send messages if not silenced"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE cp.room_id = chat_messages.room_id
        AND m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
        AND cp.is_silenced = false
    )
  );

DROP POLICY IF EXISTS "manage_messages" ON chat_messages;
CREATE POLICY "manage_messages"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

-- chat_participants
DROP POLICY IF EXISTS "Members can join rooms" ON chat_participants;
CREATE POLICY "Members can join rooms"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can leave rooms" ON chat_participants;
CREATE POLICY "Members can leave rooms"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can update their participation" ON chat_participants;
CREATE POLICY "Members can update their participation"
  ON chat_participants
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_rooms
DROP POLICY IF EXISTS "Members can create rooms" ON chat_rooms;
CREATE POLICY "Members can create rooms"
  ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can view rooms where they participate" ON chat_rooms;
CREATE POLICY "Members can view rooms where they participate"
  ON chat_rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE cp.room_id = chat_rooms.id
        AND m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
    )
  );

DROP POLICY IF EXISTS "Room creators can delete" ON chat_rooms;
CREATE POLICY "Room creators can delete"
  ON chat_rooms
  FOR DELETE
  TO authenticated
  USING (created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Room creators can update" ON chat_rooms;
CREATE POLICY "Room creators can update"
  ON chat_rooms
  FOR UPDATE
  TO authenticated
  USING (created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));