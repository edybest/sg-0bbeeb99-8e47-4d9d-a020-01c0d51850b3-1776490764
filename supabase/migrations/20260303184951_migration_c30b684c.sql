-- Create members table with all required fields
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birthday DATE NOT NULL,
  avatar_url TEXT,
  bowling_technique TEXT,
  handicap INTEGER DEFAULT 0,
  sex TEXT CHECK (sex IN ('men', 'women')) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_name TEXT NOT NULL,
  game_format TEXT,
  game_date DATE NOT NULL,
  game_type TEXT DEFAULT 'BLOK',
  year INTEGER NOT NULL,
  is_official BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_players table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  game1_score INTEGER DEFAULT 0,
  game2_score INTEGER DEFAULT 0,
  game3_score INTEGER DEFAULT 0,
  game4_score INTEGER DEFAULT 0,
  game5_score INTEGER DEFAULT 0,
  handicap INTEGER DEFAULT 0,
  total_score INTEGER GENERATED ALWAYS AS (game1_score + game2_score + game3_score + game4_score + game5_score) STORED,
  overall_score INTEGER GENERATED ALWAYS AS (game1_score + game2_score + game3_score + game4_score + game5_score + handicap) STORED,
  average_score DECIMAL(5,2) GENERATED ALWAYS AS ((game1_score + game2_score + game3_score + game4_score + game5_score)::DECIMAL / 5) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_games_year ON games(year);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_member ON game_players(member_id);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for members
CREATE POLICY "Anyone can view members" ON members FOR SELECT USING (true);
CREATE POLICY "Members can update their own profile" ON members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all members" ON members FOR ALL USING (
  EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS Policies for games
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Admins can manage games" ON games FOR ALL USING (
  EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS Policies for game_players
CREATE POLICY "Anyone can view game players" ON game_players FOR SELECT USING (true);
CREATE POLICY "Admins can manage game players" ON game_players FOR ALL USING (
  EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_players_updated_at BEFORE UPDATE ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();