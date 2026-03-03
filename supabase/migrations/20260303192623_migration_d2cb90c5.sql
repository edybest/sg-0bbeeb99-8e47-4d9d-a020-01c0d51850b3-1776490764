-- Check if user exists in auth.users and update members table
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get user ID from auth.users if exists
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'edy_c9@msn.com' LIMIT 1;
  
  IF user_uuid IS NOT NULL THEN
    -- Update or insert member record
    INSERT INTO public.members (id, username, email, is_admin, full_name, phone, birthday, sex)
    VALUES (
      user_uuid,
      'admin',
      'edy_c9@msn.com',
      true,
      'Administrator',
      '0000000000',
      '1990-01-01',
      'men'
    )
    ON CONFLICT (id) DO UPDATE SET
      username = 'admin',
      is_admin = true;
    
    RAISE NOTICE 'Admin user updated successfully with UUID: %', user_uuid;
  ELSE
    RAISE NOTICE 'No user found with email edy_c9@msn.com in auth.users. Please sign up first.';
  END IF;
END $$;

-- Also ensure the trigger is active
CREATE OR REPLACE FUNCTION public.make_edy_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'edy_c9@msn.com' THEN
    UPDATE public.members SET is_admin = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_admin_for_edy ON public.members;
CREATE TRIGGER auto_admin_for_edy
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.make_edy_admin();