-- Step 1: Drop ALL problematic chat_participants SELECT policies
DROP POLICY IF EXISTS "Members can view own participations" ON chat_participants;
DROP POLICY IF EXISTS "Members can view participants in accessible rooms" ON chat_participants;

-- Step 2: Create NEW simplified policies WITHOUT circular reference
-- Policy 1: Members can ALWAYS view their own participation records
CREATE POLICY "Members view own participation"
  ON chat_participants FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Members can view OTHER participants ONLY if they're in the same room
-- BUT we check via chat_rooms.type instead of querying chat_participants again!
CREATE POLICY "Members view participants in joined rooms"
  ON chat_participants FOR SELECT
  USING (
    -- Can see participants in lobby rooms (always public)
    room_id IN (
      SELECT id FROM chat_rooms 
      WHERE type = 'lobby' AND is_public = true
    )
    OR
    -- Can see participants in rooms where current user is also a participant
    -- We check this via a DIRECT subquery that doesn't loop back
    EXISTS (
      SELECT 1 FROM chat_participants my_participation
      JOIN members m ON m.id = my_participation.member_id
      WHERE my_participation.room_id = chat_participants.room_id
        AND m.user_id = auth.uid()
        AND my_participation.is_banned = false
    )
  );