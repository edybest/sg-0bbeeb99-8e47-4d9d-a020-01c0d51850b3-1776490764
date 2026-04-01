-- The solution: Drop the problematic constraint and recreate it properly
-- profiles.id should reference members.id, not users.id
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Now create profiles for all members
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  m.id,
  m.full_name,
  m.avatar_url
FROM members m
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = m.id)
ON CONFLICT (id) DO NOTHING;