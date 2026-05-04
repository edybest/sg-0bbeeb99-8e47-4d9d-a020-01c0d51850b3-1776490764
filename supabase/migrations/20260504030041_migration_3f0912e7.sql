-- Create indexes for whatsapp_join_participants to optimize common queries

-- Index on session_id (most frequent lookup - filtering participants by session)
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_participants_session_id 
ON public.whatsapp_join_participants(session_id);

-- Index on member_id (check duplicate joins, null-safe for unmatched members)
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_participants_member_id 
ON public.whatsapp_join_participants(member_id) 
WHERE member_id IS NOT NULL;

-- Composite index on (session_id, joined_at) for ordered participant lists
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_participants_session_joined 
ON public.whatsapp_join_participants(session_id, joined_at);

-- Composite index on (session_id, member_id) for duplicate detection
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_participants_session_member 
ON public.whatsapp_join_participants(session_id, member_id) 
WHERE member_id IS NOT NULL;