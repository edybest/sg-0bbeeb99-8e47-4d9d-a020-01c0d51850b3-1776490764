-- Simplify RLS policies to use ONLY Supabase Auth (auth.uid())
-- No more custom session management!

-- Drop old custom session functions (no longer needed)
DROP FUNCTION IF EXISTS get_current_member_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_member_id_unified() CASCADE;
DROP FUNCTION IF EXISTS set_session_context(text) CASCADE;

-- Create simple helper function that gets member_id from auth.uid()
CREATE OR REPLACE FUNCTION public.get_member_id_from_auth()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM members WHERE user_id = auth.uid();
$$;

-- Keep is_current_user_admin but simplify it
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM members WHERE user_id = auth.uid()),
    false
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_member_id_from_auth() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, anon, public;