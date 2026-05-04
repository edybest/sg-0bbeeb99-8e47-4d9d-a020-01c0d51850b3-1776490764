-- Create indexes for whatsapp_join_sessions to optimize active session lookups

-- Index on status for filtering active sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_sessions_status 
ON public.whatsapp_join_sessions(status);

-- Composite index on (status, created_at) for latest active session queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_sessions_status_created 
ON public.whatsapp_join_sessions(status, created_at DESC);