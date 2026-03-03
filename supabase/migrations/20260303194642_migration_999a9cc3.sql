-- Create new policies without circular dependency
-- 1. Anyone can view members (for login lookup)
CREATE POLICY "Anyone can view members for lookup"
ON public.members
FOR SELECT
TO public
USING (true);

-- 2. Users can insert their own member record during signup
CREATE POLICY "Users can create their own member profile"
ON public.members
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.members
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create a security definer function for admin checks
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.members 
    WHERE user_id = user_uuid 
    AND is_admin = true
  );
$$;

-- 5. Admins can manage all members (using the function to avoid recursion)
CREATE POLICY "Admins can manage all members"
ON public.members
FOR ALL
TO public
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));