-- Fix remaining unoptimized policies - Batch 1: blok_games, chat tables

-- blok_games
DROP POLICY IF EXISTS "Authenticated users can create blok games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can delete own blok games" ON blok_games;
DROP POLICY IF EXISTS "Authenticated users can update own blok games" ON blok_games;

CREATE POLICY "Authenticated users can create blok games"
  ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Authenticated users can delete own blok games"
  ON blok_games
  FOR DELETE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Authenticated users can update own blok games"
  ON blok_games
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_messages
DROP POLICY IF EXISTS "Admins can delete any message" ON chat_messages;
DROP POLICY IF EXISTS "Members can create messages in accessible rooms" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can view messages in accessible rooms" ON chat_messages;

CREATE POLICY "Admins can delete any message"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Members can create messages in accessible rooms"
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
    )
  );

CREATE POLICY "Members can update own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

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
    )
  );

-- chat_participants
DROP POLICY IF EXISTS "Admins can manage participants" ON chat_participants;
DROP POLICY IF EXISTS "Members can view participants in accessible rooms" ON chat_participants;

CREATE POLICY "Admins can manage participants"
  ON chat_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Members can view participants in accessible rooms"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT cp2.room_id FROM chat_participants cp2
      JOIN members m ON cp2.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
    )
  );

-- chat_rooms
DROP POLICY IF EXISTS "Admins can manage rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can view rooms where they participate" ON chat_rooms;

CREATE POLICY "Admins can manage rooms"
  ON chat_rooms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = (SELECT auth.uid()) AND is_admin = true)
  );

CREATE POLICY "Members can create rooms"
  ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Members can view rooms where they participate"
  ON chat_rooms
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cp.room_id FROM chat_participants cp
      JOIN members m ON cp.member_id = m.id
      WHERE m.user_id = (SELECT auth.uid())
        AND cp.is_banned = false
    )
  );