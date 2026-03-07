-- Create FiveFive games table
CREATE TABLE IF NOT EXISTS fivefive_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fivefive_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view fivefive games" ON fivefive_games FOR SELECT USING (true);
CREATE POLICY "Admins can manage fivefive games" ON fivefive_games FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_fivefive_games_date ON fivefive_games(game_date);

-- Create FiveFive game participants table
CREATE TABLE IF NOT EXISTS fivefive_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fivefive_game_id UUID NOT NULL REFERENCES fivefive_games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  game1_prize DECIMAL(10,2) DEFAULT 0,
  game2_prize DECIMAL(10,2) DEFAULT 0,
  game3_prize DECIMAL(10,2) DEFAULT 0,
  game4_prize DECIMAL(10,2) DEFAULT 0,
  game5_prize DECIMAL(10,2) DEFAULT 0,
  total_prize DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fivefive_game_id, member_id)
);

-- Enable RLS
ALTER TABLE fivefive_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view fivefive participants" ON fivefive_participants FOR SELECT USING (true);
CREATE POLICY "Admins can manage fivefive participants" ON fivefive_participants FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_fivefive_participants_game ON fivefive_participants(fivefive_game_id);
CREATE INDEX idx_fivefive_participants_member ON fivefive_participants(member_id);

COMMENT ON TABLE fivefive_games IS 'FiveFive game sessions by date';
COMMENT ON TABLE fivefive_participants IS 'Players participating in FiveFive games with their prizes';