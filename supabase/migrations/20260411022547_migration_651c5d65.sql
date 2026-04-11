-- Remove duplicate INSERT policies on mini_blok_collaborators
DROP POLICY IF EXISTS "auth_insert_mini_blok_collaborators" ON mini_blok_collaborators;

-- Keep only "insert_mini_blok_collaborators"