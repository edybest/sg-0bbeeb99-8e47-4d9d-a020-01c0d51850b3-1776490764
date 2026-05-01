-- Create table for WhatsApp join sessions (when admin posts #JOINBLOK)
CREATE TABLE IF NOT EXISTS public.whatsapp_join_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_name TEXT NOT NULL,
  game_date DATE NOT NULL,
  game_time TEXT,
  location TEXT,
  format_details TEXT,
  price TEXT,
  payment_info TEXT,
  original_message TEXT,
  fonnte_group_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_phone TEXT
);

-- Create table for participants who join via #join
CREATE TABLE IF NOT EXISTS public.whatsapp_join_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.whatsapp_join_sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  username TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, member_id)
);

-- RLS for whatsapp_join_sessions
ALTER TABLE public.whatsapp_join_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view join sessions"
  ON public.whatsapp_join_sessions FOR SELECT
  USING (true);

CREATE POLICY "System can create join sessions"
  ON public.whatsapp_join_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage join sessions"
  ON public.whatsapp_join_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- RLS for whatsapp_join_participants
ALTER TABLE public.whatsapp_join_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view participants"
  ON public.whatsapp_join_participants FOR SELECT
  USING (true);

CREATE POLICY "System can add participants"
  ON public.whatsapp_join_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage participants"
  ON public.whatsapp_join_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_sessions_date ON public.whatsapp_join_sessions(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_sessions_status ON public.whatsapp_join_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_participants_session ON public.whatsapp_join_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_join_participants_member ON public.whatsapp_join_participants(member_id);