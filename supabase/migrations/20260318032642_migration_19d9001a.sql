-- Step 1: Create a SECURITY DEFINER function to bypass RLS and break circular dependency
CREATE OR REPLACE FUNCTION get_user_chat_rooms(user_uuid UUID)
RETURNS TABLE (room_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- This function runs with elevated privileges and bypasses RLS
  -- Breaking the circular dependency between chat_rooms and chat_participants
  RETURN QUERY
  SELECT DISTINCT cp.room_id
  FROM chat_participants cp
  JOIN members m ON cp.member_id = m.id
  WHERE m.user_id = user_uuid
    AND cp.is_banned = false;
END;
$$;

-- Step 2: Drop the problematic policy
DROP POLICY IF EXISTS "Members can view their rooms" ON chat_rooms;

-- Step 3: Create new simplified policy using the SECURITY DEFINER function
CREATE POLICY "Members can view their rooms"
  ON chat_rooms
  FOR SELECT
  USING (
    -- Use the function instead of direct subquery to avoid circular dependency
    id IN (SELECT room_id FROM get_user_chat_rooms(auth.uid()))
    OR (type = 'lobby' AND is_public = true)  -- Include public lobbies
  );