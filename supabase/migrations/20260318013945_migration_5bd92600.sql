-- 1) Padam policy SELECT lama yang menyebabkan recursion
DROP POLICY IF EXISTS "Members can view room participants" ON public.chat_participants;

-- 2) Cipta policy SELECT baru tanpa recursion:
--    User hanya boleh lihat rekod chat_participants milik dirinya sendiri
CREATE POLICY "Members can view room participants"
ON public.chat_participants
FOR SELECT
TO public
USING (
  member_id IN (
    SELECT id
    FROM public.members
    WHERE user_id = auth.uid()
  )
);

-- 3) Tambah policy INSERT untuk benarkan member join lobby
DROP POLICY IF EXISTS "Members can join lobby" ON public.chat_participants;
CREATE POLICY "Members can join lobby"
ON public.chat_participants
FOR INSERT
TO public
WITH CHECK (
  room_id IN (
    SELECT id
    FROM public.chat_rooms
    WHERE type = 'lobby'
      AND is_public = true
  )
  AND member_id IN (
    SELECT id
    FROM public.members
    WHERE user_id = auth.uid()
  )
);