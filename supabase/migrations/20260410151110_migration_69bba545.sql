-- COMPREHENSIVE FIX: Optimize all remaining unoptimized policies for existing tables
-- Batch 1: blok_games, chat_messages, chat_participants, chat_rooms

-- blok_games
DROP POLICY IF EXISTS "Authenticated users can create blok games" ON blok_games;
CREATE POLICY "Authenticated users can create blok games"
  ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can delete own blok games" ON blok_games;
CREATE POLICY "Authenticated users can delete own blok games"
  ON blok_games
  FOR DELETE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can update own blok games" ON blok_games;
CREATE POLICY "Authenticated users can update own blok games"
  ON blok_games
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_messages
DROP POLICY IF EXISTS "Members can delete own messages or admins can delete any" ON chat_messages;
CREATE POLICY "Members can delete own messages or admins can delete any"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m 
      WHERE m.user_id = (SELECT auth.uid())
        AND (m.is_admin = true OR chat_messages.sender_id = m.id)
    )
  );

DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
CREATE POLICY "Members can update own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_participants
DROP POLICY IF EXISTS "Members can delete own participation" ON chat_participants;
CREATE POLICY "Members can delete own participation"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Members can update own participation status" ON chat_participants;
CREATE POLICY "Members can update own participation status"
  ON chat_participants
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_rooms
DROP POLICY IF EXISTS "Members can update rooms where they participate" ON chat_rooms;
CREATE POLICY "Members can update rooms where they participate"
  ON chat_rooms
  FOR UPDATE
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