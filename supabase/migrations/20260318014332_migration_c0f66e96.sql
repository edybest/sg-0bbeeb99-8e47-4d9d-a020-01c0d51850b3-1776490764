-- 1. Buat secure function untuk check samada user adalah ahli dalam sesuatu room
-- SECURITY DEFINER membolehkan function ini run tanpa disekat oleh RLS (mengelakkan recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.chat_participants cp
    JOIN public.members m ON m.id = cp.member_id
    WHERE cp.room_id = p_room_id AND m.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Padam polisi RLS yang sementara tadi
DROP POLICY IF EXISTS "Members see their own chat participation" ON public.chat_participants;

-- 3. Cipta polisi RLS baru yang menggunakan function di atas
-- Ini membenarkan user melihat SEMUA participants dalam bilik yang dia sendiri dah join
CREATE POLICY "Members can view participants in their rooms"
ON public.chat_participants
FOR SELECT TO public
USING ( public.is_room_member(room_id, auth.uid()) );