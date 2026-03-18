-- Drop ALL existing policies completely for both tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all chat_rooms policies
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_rooms')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_rooms', r.policyname);
    END LOOP;
    
    -- Drop all chat_participants policies
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_participants')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_participants', r.policyname);
    END LOOP;
END $$;