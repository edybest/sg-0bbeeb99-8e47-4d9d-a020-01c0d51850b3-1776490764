-- Fix training_scores policy with correct schema (uses member_id directly)
DROP POLICY IF EXISTS "Members can manage own training scores" ON training_scores;
CREATE POLICY "Members can manage own training scores"
  ON training_scores
  FOR ALL
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
  );

-- Now let's identify ALL remaining unoptimized policies
SELECT 
  tablename,
  policyname,
  cmd,
  SUBSTRING(qual FROM 1 FOR 100) as qual_preview,
  SUBSTRING(with_check FROM 1 FOR 100) as with_check_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' AND qual NOT LIKE '%(select auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' AND with_check NOT LIKE '%(select auth.uid())%')
  )
ORDER BY tablename, policyname
LIMIT 50;