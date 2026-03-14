-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Members can create shares for mini blok they own or collaborate" ON mini_blok_shares;

-- Create new policy that allows Admins, Owners, and Collaborators
CREATE POLICY "Admins, owners, and collaborators can create shares"
ON mini_blok_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND (
      -- Allow if user is admin
      m.is_admin = true
      OR
      -- Allow if user is the owner
      EXISTS (
        SELECT 1 FROM mini_blok mb
        WHERE mb.id = mini_blok_id
        AND mb.owner_id = m.id
      )
      OR
      -- Allow if user is a collaborator
      EXISTS (
        SELECT 1 FROM mini_blok_collaborators mbc
        WHERE mbc.mini_blok_id = mini_blok_shares.mini_blok_id
        AND mbc.member_id = m.id
      )
    )
  )
);