-- Ensure RLS policies exist for club_settings so that admins can insert, update, delete
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'club_settings' AND policyname = 'Admins can insert club settings'
    ) THEN
        CREATE POLICY "Admins can insert club settings" ON club_settings FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND is_admin = true)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'club_settings' AND policyname = 'Admins can update club settings'
    ) THEN
        CREATE POLICY "Admins can update club settings" ON club_settings FOR UPDATE USING (
          EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND is_admin = true)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'club_settings' AND policyname = 'Admins can delete club settings'
    ) THEN
        CREATE POLICY "Admins can delete club settings" ON club_settings FOR DELETE USING (
          EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND is_admin = true)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'club_settings' AND policyname = 'Anyone can view club settings'
    ) THEN
        CREATE POLICY "Anyone can view club settings" ON club_settings FOR SELECT USING (true);
    END IF;
END $$;