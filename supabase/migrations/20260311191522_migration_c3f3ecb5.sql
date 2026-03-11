-- Create mini_blok table for casual bowling scores
CREATE TABLE IF NOT EXISTS mini_blok (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Blok Suka-Suki',
  player_name TEXT NOT NULL,
  game_1 INTEGER,
  game_2 INTEGER,
  game_3 INTEGER,
  game_4 INTEGER,
  game_5 INTEGER,
  game_6 INTEGER,
  game_7 INTEGER,
  game_8 INTEGER,
  game_9 INTEGER,
  game_10 INTEGER,
  handicap INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER,
  overall_score INTEGER,
  average DECIMAL(10,2),
  differential DECIMAL(10,2),
  games_played INTEGER NOT NULL DEFAULT 1,
  location TEXT NOT NULL DEFAULT 'Daiman Bowl',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mini_blok ENABLE ROW LEVEL SECURITY;

-- Public can view all records
CREATE POLICY "Anyone can view mini_blok records"
  ON mini_blok FOR SELECT
  USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert mini_blok records"
  ON mini_blok FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own records, admins can update all
CREATE POLICY "Users can update their own mini_blok records"
  ON mini_blok FOR UPDATE
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Users can delete their own records, admins can delete all
CREATE POLICY "Users can delete their own mini_blok records"
  ON mini_blok FOR DELETE
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = auth.uid() 
      AND members.is_admin = true
    )
  );

-- Create index for performance
CREATE INDEX idx_mini_blok_date ON mini_blok(date DESC);
CREATE INDEX idx_mini_blok_created_by ON mini_blok(created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_mini_blok_updated_at
  BEFORE UPDATE ON mini_blok
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();