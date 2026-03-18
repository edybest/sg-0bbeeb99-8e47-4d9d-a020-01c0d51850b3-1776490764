-- Step 2: Drop ALL chat-related policies completely
DROP POLICY IF EXISTS "Members can view their rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can create direct chats" ON chat_rooms;
DROP POLICY IF EXISTS "Members can update their rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Lobby: anyone can view public lobbies" ON chat_rooms;
DROP POLICY IF EXISTS "Rooms: system can manage all" ON chat_rooms;

DROP POLICY IF EXISTS "Members can view participants in accessible rooms" ON chat_participants;
DROP POLICY IF EXISTS "Members can view lobby participants" ON chat_participants;
DROP POLICY IF EXISTS "System can insert participants" ON chat_participants;
DROP POLICY IF EXISTS "System can update participants" ON chat_participants;
DROP POLICY IF EXISTS "System can delete participants" ON chat_participants;