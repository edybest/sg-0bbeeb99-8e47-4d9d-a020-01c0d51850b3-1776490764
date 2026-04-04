-- Create couples table
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  couple_name TEXT NOT NULL,
  player1_id UUID REFERENCES members(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player1_id, player2_id)
);

-- Create couple_scores table with 6 games
CREATE TABLE IF NOT EXISTS couple_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  game1_score INT DEFAULT 0,
  game2_score INT DEFAULT 0,
  game3_score INT DEFAULT 0,
  game4_score INT DEFAULT 0,
  game5_score INT DEFAULT 0,
  game6_score INT DEFAULT 0,
  handicap INT DEFAULT 0,
  total_score INT GENERATED ALWAYS AS (game1_score + game2_score + game3_score + game4_score + game5_score + game6_score) STORED,
  overall_score INT GENERATED ALWAYS AS (game1_score + game2_score + game3_score + game4_score + game5_score + game6_score + handicap) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(couple_id)
);

-- Enable RLS
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couples
CREATE POLICY "public_read_couples" ON couples FOR SELECT USING (true);
CREATE POLICY "auth_insert_couples" ON couples FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_couples" ON couples FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_couples" ON couples FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for couple_scores
CREATE POLICY "public_read_couple_scores" ON couple_scores FOR SELECT USING (true);
CREATE POLICY "auth_insert_couple_scores" ON couple_scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_couple_scores" ON couple_scores FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_couple_scores" ON couple_scores FOR DELETE USING (auth.uid() IS NOT NULL);