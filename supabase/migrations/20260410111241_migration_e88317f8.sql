-- CRITICAL PERFORMANCE FIX: Update only existing tables with SELECT wrapper
-- Batch 1: blok_games, chat_messages, chat_participants, chat_rooms

-- 1. blok_games - Fix policies that use auth.uid() directly
DROP POLICY IF EXISTS "Users can delete their own blok games" ON blok_games;
CREATE POLICY "Users can delete their own blok games"
  ON blok_games
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = member_id);

DROP POLICY IF EXISTS "Users can update their own blok games" ON blok_games;
CREATE POLICY "Users can update their own blok games"
  ON blok_games
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = member_id);

-- 2. chat_messages - Fix policies
DROP POLICY IF EXISTS "Members can view messages in accessible rooms" ON chat_messages;
CREATE POLICY "Members can view messages in accessible rooms"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE cp.room_id = chat_messages.room_id 
        AND m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
    ) 
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Participants can send messages if not silenced" ON chat_messages;
CREATE POLICY "Participants can send messages if not silenced"
  ON chat_messages
  FOR ALL
  TO authenticated
  WITH CHECK (
    sender_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_messages.room_id
        AND cp.member_id = chat_messages.sender_id
        AND cp.is_banned = false
        AND cp.is_silenced = false
    )
  );

-- 3. chat_participants - Fix policies
DROP POLICY IF EXISTS "Members can join rooms" ON chat_participants;
CREATE POLICY "Members can join rooms"
  ON chat_participants
  FOR ALL
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can leave rooms" ON chat_participants;
CREATE POLICY "Members can leave rooms"
  ON chat_participants
  FOR ALL
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update their participation" ON chat_participants;
CREATE POLICY "Members can update their participation"
  ON chat_participants
  FOR ALL
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

-- 4. chat_rooms - Fix policies
DROP POLICY IF EXISTS "Members can create rooms" ON chat_rooms;
CREATE POLICY "Members can create rooms"
  ON chat_rooms
  FOR ALL
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can view rooms where they participate" ON chat_rooms;
CREATE POLICY "Members can view rooms where they participate"
  ON chat_rooms
  FOR ALL
  TO authenticated
  USING (
    (type = 'lobby' AND is_public = true)
    OR created_by IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
    OR id IN (
      SELECT cp.room_id FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
    )
  );

DROP POLICY IF EXISTS "Room creators can delete" ON chat_rooms;
CREATE POLICY "Room creators can delete"
  ON chat_rooms
  FOR ALL
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Room creators can update" ON chat_rooms;
CREATE POLICY "Room creators can update"
  ON chat_rooms
  FOR ALL
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );