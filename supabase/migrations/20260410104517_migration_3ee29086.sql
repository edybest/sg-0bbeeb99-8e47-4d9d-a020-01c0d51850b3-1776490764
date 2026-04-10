-- SECURITY FIX 7: Fix remaining functions with mutable search_path

-- Fix is_admin_user function
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role 
  FROM members 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  RETURN user_role = 'admin';
END;
$$;

-- Fix update_mini_blok_updated_at function
DROP FUNCTION IF EXISTS update_mini_blok_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_mini_blok_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mini_bloks 
  SET updated_at = NOW() 
  WHERE id = NEW.mini_blok_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger for mini_bloks if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mini_bloks') THEN
    DROP TRIGGER IF EXISTS update_mini_blok_timestamp ON mini_bloks;
    CREATE TRIGGER update_mini_blok_timestamp
      BEFORE UPDATE ON mini_bloks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;