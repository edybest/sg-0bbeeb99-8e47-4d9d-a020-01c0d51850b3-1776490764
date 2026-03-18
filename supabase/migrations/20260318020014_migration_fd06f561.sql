-- 1. Padam polisi-polisi yang mungkin bergantung kepada fungsi ini
DROP POLICY IF EXISTS "Members can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Members can view room participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Members see their own chat participation" ON public.chat_participants;

-- 2. Padam fungsi lama
DROP FUNCTION IF EXISTS public.is_room_member(uuid, uuid);

-- 3. Cipta fungsi baru dengan parameter yang bersih
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM chat_participants cp
    JOIN members m ON cp.member_id = m.id
    WHERE cp.room_id = check_room_id
    AND m.user_id = check_user_id
  );
END;
$$;

-- 4. Cipta semula polisi SELECT yang bersih dan stabil
CREATE POLICY "Members can view participants in their rooms"
ON public.chat_participants
FOR SELECT 
TO public
USING (
  public.is_room_member(room_id, auth.uid())
);