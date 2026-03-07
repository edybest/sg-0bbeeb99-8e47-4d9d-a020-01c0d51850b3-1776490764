-- Create FiveFive prize configuration table
CREATE TABLE IF NOT EXISTS fivefive_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_position INTEGER NOT NULL, -- 1st place, 2nd place, etc.
  prize_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  winner_count INTEGER NOT NULL DEFAULT 1, -- How many winners share this prize
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rank_position)
);

-- Enable RLS
ALTER TABLE fivefive_prizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view fivefive prizes" ON fivefive_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage fivefive prizes" ON fivefive_prizes FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_fivefive_prizes_rank ON fivefive_prizes(rank_position);

-- Insert default prizes (5 ranks)
INSERT INTO fivefive_prizes (rank_position, prize_amount, winner_count) VALUES
(1, 100.00, 1),
(2, 80.00, 1),
(3, 60.00, 1),
(4, 40.00, 1),
(5, 20.00, 1)
ON CONFLICT (rank_position) DO NOTHING;

COMMENT ON TABLE fivefive_prizes IS 'Prize configuration for FiveFive games';
COMMENT ON COLUMN fivefive_prizes.rank_position IS 'Ranking position (1st, 2nd, 3rd, etc.)';
COMMENT ON COLUMN fivefive_prizes.prize_amount IS 'Prize amount for this rank';
COMMENT ON COLUMN fivefive_prizes.winner_count IS 'Number of winners to display input fields for';