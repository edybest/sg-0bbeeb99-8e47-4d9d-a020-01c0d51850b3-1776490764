-- Now create SIMPLE policies with NO circular references

-- ============================================
-- CHAT_ROOMS POLICIES (Simple, direct checks)
-- ============================================

-- SELECT: Members can view rooms they created OR public lobbies
CREATE POLICY "Members can view their created rooms or public lobbies"
  ON chat_rooms FOR SELECT
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR (type = 'lobby' AND is_public = true)
  );

-- INSERT: Members can create rooms
CREATE POLICY "Members can create rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- UPDATE: Only room creators can update
CREATE POLICY "Room creators can update"
  ON chat_rooms FOR UPDATE
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- DELETE: Only room creators can delete
CREATE POLICY "Room creators can delete"
  ON chat_rooms FOR DELETE
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
  );