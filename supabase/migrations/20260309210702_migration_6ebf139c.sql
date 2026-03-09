-- Clean up DUPLICATE policies on member_sessions - remove old auth.uid() policies
DROP POLICY IF EXISTS "Admins can delete sessions" ON member_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON member_sessions;
DROP POLICY IF EXISTS "Members can view their own sessions" ON member_sessions;
DROP POLICY IF EXISTS "Sessions are viewable by session owner" ON member_sessions;

-- Keep: "Admin full access to member_sessions", "Members can manage their own sessions"