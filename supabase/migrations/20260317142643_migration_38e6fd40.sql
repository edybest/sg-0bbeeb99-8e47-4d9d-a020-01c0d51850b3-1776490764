-- Create trigger to auto-add new members to Lobby Room
CREATE OR REPLACE FUNCTION auto_join_lobby()
RETURNS TRIGGER AS $$
DECLARE
  v_lobby_id UUID;
BEGIN
  -- Get Lobby Room ID
  SELECT id INTO v_lobby_id
  FROM chat_rooms
  WHERE name = 'Lobby AMBC Club' AND type = 'group'
  LIMIT 1;
  
  -- Add new member to Lobby
  IF v_lobby_id IS NOT NULL THEN
    INSERT INTO chat_participants (room_id, member_id)
    VALUES (v_lobby_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Create trigger on members table
DROP TRIGGER IF EXISTS trigger_auto_join_lobby ON members;
CREATE TRIGGER trigger_auto_join_lobby
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION auto_join_lobby();

-- Backfill: Add existing members to Lobby
INSERT INTO chat_participants (room_id, member_id)
SELECT 
  (SELECT id FROM chat_rooms WHERE name = 'Lobby AMBC Club' AND type = 'group' LIMIT 1),
  m.id
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM chat_participants cp
  WHERE cp.room_id = (SELECT id FROM chat_rooms WHERE name = 'Lobby AMBC Club' AND type = 'group' LIMIT 1)
    AND cp.member_id = m.id
)
ON CONFLICT DO NOTHING;