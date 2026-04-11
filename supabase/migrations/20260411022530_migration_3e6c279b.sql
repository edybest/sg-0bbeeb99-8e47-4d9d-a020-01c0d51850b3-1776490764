-- Remove duplicate DELETE policies on mini_blok_collaborators
DROP POLICY IF EXISTS "auth_delete_mini_blok_collaborators" ON mini_blok_collaborators;

-- Keep only "delete_mini_blok_collaborators"