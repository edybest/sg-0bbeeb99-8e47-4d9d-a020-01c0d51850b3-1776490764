-- Drop function first to change return type
DROP FUNCTION IF EXISTS get_member_chat_rooms(UUID);

-- Recreate RPC function to get member's chat rooms
CREATE OR REPLACE FUNCTION get_member_chat_rooms(p_member_id UUID)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  room_type TEXT,
  is_public BOOLEAN,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_banned BOOLEAN,
  is_silenced BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.name,
    cr.type,
    cr.is_public,
    cr.last_message_at,
    COALESCE(
      (SELECT COUNT(*)
       FROM chat_messages cm
       WHERE cm.room_id = cr.id
         AND cm.created_at > cp.last_read_at
         AND cm.deleted_at IS NULL
         AND cm.sender_id != p_member_id
      ), 0
    ) as unread_count,
    cp.is_banned,
    cp.is_silenced
  FROM chat_rooms cr
  INNER JOIN chat_participants cp ON cp.room_id = cr.id
  WHERE cp.member_id = p_member_id
    AND cp.is_banned = false
  ORDER BY cr.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;