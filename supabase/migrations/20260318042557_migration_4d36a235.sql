-- 1. Kemas kini polisi RLS untuk membenarkan pembacaan peserta chat
DROP POLICY IF EXISTS "Members can view their own participation" ON chat_participants;
CREATE POLICY "Anyone can view chat participants" ON chat_participants FOR SELECT USING (true);