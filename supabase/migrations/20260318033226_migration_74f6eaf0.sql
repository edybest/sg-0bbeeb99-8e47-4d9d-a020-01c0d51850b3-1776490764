-- ============================================
-- CHAT_PARTICIPANTS POLICIES (Simple, direct checks - NO circular reference)
-- ============================================

-- SELECT: Members can view their own participant records
CREATE POLICY "Members can view their own participation"
  ON chat_participants FOR SELECT
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- INSERT: Members can add themselves to rooms
CREATE POLICY "Members can join rooms"
  ON chat_participants FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- UPDATE: Members can update their own participation
CREATE POLICY "Members can update their participation"
  ON chat_participants FOR UPDATE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- DELETE: Members can remove themselves from rooms
CREATE POLICY "Members can leave rooms"
  ON chat_participants FOR DELETE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );