-- Create game_players table (scores for each player in a game)
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  game1_score INTEGER DEFAULT 0,
  game2_score INTEGER DEFAULT 0,
  game3_score INTEGER DEFAULT 0,
  game4_score INTEGER DEFAULT 0,
  game5_score INTEGER DEFAULT 0,
  handicap INTEGER DEFAULT 0,
  total_score INTEGER GENERATED ALWAYS AS (game1_score + game2_score + game3_score + game4_score + game5_score) STORED,
  overall_score INTEGER GENERATED ALWAYS AS (game1_score + game2_score + game3_score + game4_score + game5_score + handicap) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, member_id)
);

-- Enable RLS
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view game_players" ON game_players
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage game_players" ON game_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );