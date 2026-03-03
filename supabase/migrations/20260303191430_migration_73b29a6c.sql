-- Create a function to automatically make edy_c9@msn.com an admin
CREATE OR REPLACE FUNCTION public.auto_make_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'edy_c9@msn.com' THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on members table
DROP TRIGGER IF EXISTS trigger_auto_admin ON public.members;
CREATE TRIGGER trigger_auto_admin
BEFORE INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.auto_make_admin();

-- Also update if the user already exists (just in case)
UPDATE public.members SET is_admin = true WHERE email = 'edy_c9@msn.com';