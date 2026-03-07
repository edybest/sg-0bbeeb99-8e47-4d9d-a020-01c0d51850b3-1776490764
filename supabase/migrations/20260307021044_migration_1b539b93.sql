-- Recreate fivefive_prizes table with proper structure for multiple configurations
-- Each row = one configuration for specific player count

DROP TABLE IF EXISTS fivefive_prizes CASCADE;

CREATE TABLE fivefive_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_count INTEGER NOT NULL,
  prize_count INTEGER NOT NULL,
  prizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure player_count is unique (one config per player count)
  CONSTRAINT unique_player_count UNIQUE (player_count),
  
  -- Validation
  CONSTRAINT valid_player_count CHECK (player_count > 0 AND player_count <= 50),
  CONSTRAINT valid_prize_count CHECK (prize_count > 0 AND prize_count <= player_count),
  CONSTRAINT valid_prizes CHECK (jsonb_array_length(prizes) = prize_count)
);

-- Enable RLS
ALTER TABLE fivefive_prizes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view FiveFive prize configurations"
  ON fivefive_prizes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert FiveFive configurations"
  ON fivefive_prizes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update FiveFive configurations"
  ON fivefive_prizes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete FiveFive configurations"
  ON fivefive_prizes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add some default configurations
INSERT INTO fivefive_prizes (player_count, prize_count, prizes)
VALUES 
  (1, 1, '[100]'::jsonb),
  (2, 2, '[80, 50]'::jsonb),
  (5, 3, '[100, 80, 50]'::jsonb),
  (10, 5, '[100, 80, 50, 30, 20]'::jsonb)
ON CONFLICT (player_count) DO NOTHING;

-- Comments
COMMENT ON TABLE fivefive_prizes IS 'FiveFive prize configurations for different player counts';
COMMENT ON COLUMN fivefive_prizes.player_count IS 'Number of players (unique key)';
COMMENT ON COLUMN fivefive_prizes.prize_count IS 'Number of prizes to distribute';
COMMENT ON COLUMN fivefive_prizes.prizes IS 'Array of prize amounts in RM (JSONB)';