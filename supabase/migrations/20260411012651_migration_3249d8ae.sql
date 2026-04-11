-- Fix the FINAL unoptimized policy: mini_blok_collaborators INSERT
DROP POLICY IF EXISTS "Anyone authenticated can add collaborators" ON mini_blok_collaborators;

CREATE POLICY "optimized_insert_mini_blok_collaborators"
  ON mini_blok_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);