-- Create couple_reactions_log table
CREATE TABLE IF NOT EXISTS couple_reactions_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  couple_score_id UUID REFERENCES couple_scores(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE couple_reactions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_couple_reactions" ON couple_reactions_log FOR SELECT USING (true);
CREATE POLICY "auth_insert_couple_reactions" ON couple_reactions_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);