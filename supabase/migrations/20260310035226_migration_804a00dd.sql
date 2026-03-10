-- Drop the old custom session functions (correct function names)
DROP FUNCTION IF EXISTS public.get_current_member_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_member_id_unified() CASCADE;
DROP FUNCTION IF EXISTS public.set_session_context(text) CASCADE;

-- Verify the new simplified functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('get_current_user_member', 'is_current_user_admin')
  AND pronamespace = 'public'::regnamespace;