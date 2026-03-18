-- 1. Padam polisi yang bergantung kepada fungsi
DROP POLICY IF EXISTS "Members can view participants in their rooms" ON public.chat_participants;

-- 2. Padam fungsi yang sedia ada
DROP FUNCTION IF EXISTS public.is_room_member(uuid, uuid);

-- 3. Cipta fungsi baru dengan SECURITY DEFINER yang selamat
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member_id uuid;
  v_is_member boolean;
BEGIN
  -- Dapatkan member_id dari user_id semasa
  SELECT id INTO v_member_id
  FROM public.members
  WHERE user_id = p_user_id;
  
  IF v_member_id IS NULL THEN
    RETURN false;
  END IF;

  -- Semak jika member ini adalah sebahagian daripada bilik chat ini
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE room_id = p_room_id
    AND member_id = v_member_id
  ) INTO v_is_member;

  RETURN v_is_member;
END;
$$;

-- 4. Pasang semula polisi SELECT
CREATE POLICY "Members can view participants in their rooms" 
ON public.chat_participants
FOR SELECT 
TO public
USING (
  public.is_room_member(room_id, auth.uid())
);