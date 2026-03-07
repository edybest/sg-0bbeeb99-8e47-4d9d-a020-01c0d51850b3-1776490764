-- Drop old fivefive_prizes table structure
DROP TABLE IF EXISTS fivefive_prizes CASCADE;

-- Create new simplified fivefive_prizes table
CREATE TABLE fivefive_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_players INTEGER NOT NULL CHECK (total_players > 0),
  prize_count INTEGER NOT NULL CHECK (prize_count > 0 AND prize_count <= total_players),
  prizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE fivefive_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fivefive prizes" ON fivefive_prizes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert fivefive prizes" ON fivefive_prizes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update fivefive prizes" ON fivefive_prizes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete fivefive prizes" ON fivefive_prizes FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add helpful comments
COMMENT ON TABLE fivefive_prizes IS 'FiveFive prize configuration';
COMMENT ON COLUMN fivefive_prizes.total_players IS 'Total number of players in the game';
COMMENT ON COLUMN fivefive_prizes.prize_count IS 'Number of prizes to distribute (creates that many input fields)';
COMMENT ON COLUMN fivefive_prizes.prizes IS 'Array of prize amounts in order [100, 80, 50, 30, 20]';

-- Insert default configuration
INSERT INTO fivefive_prizes (total_players, prize_count, prizes)
VALUES (10, 5, '[100, 80, 50, 30, 20]'::jsonb)
ON CONFLICT DO NOTHING;