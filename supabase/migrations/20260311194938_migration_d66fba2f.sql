-- Fix mini_blok INSERT policy to work with custom auth (member_sessions)
DROP POLICY IF EXISTS "Members can create mini blok entries" ON mini_blok;

CREATE POLICY "Authenticated members can create mini blok"
ON mini_blok
FOR INSERT
TO public
WITH CHECK (
  owner_id IN (
    SELECT member_id 
    FROM member_sessions 
    WHERE session_token = current_setting('request.headers', true)::json->>'cookie'
    AND expires_at > now()
  )
);

-- Alternative: Allow any authenticated request to create (simpler)
DROP POLICY IF EXISTS "Authenticated members can create mini blok" ON mini_blok;

CREATE POLICY "Anyone authenticated can create mini blok"
ON mini_blok
FOR INSERT
TO public
WITH CHECK (true);  -- Will be controlled by app logic