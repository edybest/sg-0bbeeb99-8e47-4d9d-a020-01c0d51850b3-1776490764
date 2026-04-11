-- Continue fixing remaining RLS policies - Batch 2

-- blok_games: Authenticated users can insert blok games
DROP POLICY IF EXISTS "Authenticated users can insert blok games" ON blok_games;
CREATE POLICY "Authenticated users can insert blok games"
  ON blok_games
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid())));

-- chat_messages: Participants can send messages if not silenced
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
        AND cp.is_silenced = false
        AND cp.is_banned = false
    )
  );

-- chat_participants: Members can join rooms
DROP POLICY IF EXISTS "Members can join rooms" ON chat_participants;
CREATE POLICY "Members can join rooms"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- chat_participants: Members can leave rooms
DROP POLICY IF EXISTS "Members can leave rooms" ON chat_participants;
CREATE POLICY "Members can leave rooms"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- chat_participants: Members can update their participation
DROP POLICY IF EXISTS "Members can update their participation" ON chat_participants;
CREATE POLICY "Members can update their participation"
  ON chat_participants
  FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );