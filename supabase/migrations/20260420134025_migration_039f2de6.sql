-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also drop the function since we don't need it anymore
DROP FUNCTION IF EXISTS public.handle_new_user();