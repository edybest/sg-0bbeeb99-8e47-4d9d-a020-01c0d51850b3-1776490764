-- 1. Buang polisi dan fungsi bermasalah yang menyebabkan circular dependency
DROP POLICY IF EXISTS "Members can view participants in their rooms" ON public.chat_participants;
DROP FUNCTION IF EXISTS public.is_room_member(uuid, uuid) CASCADE;

-- 2. Buat DUA polisi berlapis tanpa circular dependency

-- POLISI 1: User boleh lihat rekod penyertaan DIRI SENDIRI
CREATE POLICY "Members can view own participations"
ON public.chat_participants
FOR SELECT
TO public
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

-- POLISI 2: User boleh lihat rekod ahli LAIN dalam bilik yang sama
CREATE POLICY "Members can view other participants in same room"
ON public.chat_participants
FOR SELECT
TO public
USING (
  room_id IN (
    SELECT cp2.room_id 
    FROM public.chat_participants cp2
    JOIN public.members m ON cp2.member_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- 3. Polisi INSERT untuk join lobby masih perlu ada
-- (pastikan ia tidak terhapus)