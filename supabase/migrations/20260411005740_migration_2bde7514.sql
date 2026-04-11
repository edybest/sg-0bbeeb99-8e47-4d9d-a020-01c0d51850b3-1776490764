-- Remove all old unoptimized policies - Batch 2: game_comments, member_feedback, chat tables

-- game_comments - remove old policies
DROP POLICY IF EXISTS "Members can delete own comments" ON game_comments;
DROP POLICY IF EXISTS "Members can insert comments" ON game_comments;
DROP POLICY IF EXISTS "Members can update own comments" ON game_comments;
DROP POLICY IF EXISTS "auth_insert_comments" ON game_comments;
DROP POLICY IF EXISTS "manage_comments" ON game_comments;

-- member_feedback - remove old policies
DROP POLICY IF EXISTS "Admins can delete feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can submit feedback" ON member_feedback;
DROP POLICY IF EXISTS "Members can update own feedback" ON member_feedback;
DROP POLICY IF EXISTS "view_feedback" ON member_feedback;

-- chat_messages - remove old policies
DROP POLICY IF EXISTS "Members can delete own messages or admins can delete any" ON chat_messages;
DROP POLICY IF EXISTS "Participants can send messages if not silenced" ON chat_messages;
DROP POLICY IF EXISTS "manage_messages" ON chat_messages;

-- chat_participants - remove old policies
DROP POLICY IF EXISTS "Members can delete own participation" ON chat_participants;
DROP POLICY IF EXISTS "Members can join rooms" ON chat_participants;
DROP POLICY IF EXISTS "Members can leave rooms" ON chat_participants;
DROP POLICY IF EXISTS "Members can update own participation status" ON chat_participants;
DROP POLICY IF EXISTS "Members can update their participation" ON chat_participants;

-- chat_rooms - remove old policies
DROP POLICY IF EXISTS "Members can update rooms where they participate" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can delete" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can update" ON chat_rooms;