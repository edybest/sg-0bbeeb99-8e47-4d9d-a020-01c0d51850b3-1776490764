CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND m.is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id
  FROM public.members m
  WHERE m.user_id = auth.uid()
  LIMIT 1;
$$;

ALTER TABLE public.gallery_albums DROP CONSTRAINT IF EXISTS gallery_albums_created_by_fkey;
ALTER TABLE public.gallery_albums
  ADD CONSTRAINT gallery_albums_created_by_user_id_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.gallery_images DROP CONSTRAINT IF EXISTS gallery_images_uploaded_by_fkey;
ALTER TABLE public.gallery_images
  ADD CONSTRAINT gallery_images_uploaded_by_user_id_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.gallery_permissions DROP CONSTRAINT IF EXISTS gallery_permissions_granted_by_fkey;
ALTER TABLE public.gallery_permissions
  ADD CONSTRAINT gallery_permissions_granted_by_user_id_fkey
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE CASCADE;