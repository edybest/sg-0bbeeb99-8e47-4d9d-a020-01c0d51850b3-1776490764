-- Create table to track lane spin results
CREATE TABLE IF NOT EXISTS lane_spin_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lane_position TEXT NOT NULL,
  spun_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one spin per member per game
  CONSTRAINT lane_spin_results_game_member_unique UNIQUE(game_id, member_id)
);

-- Add indexes for performance
CREATE INDEX idx_lane_spin_results_game ON lane_spin_results(game_id);
CREATE INDEX idx_lane_spin_results_member ON lane_spin_results(member_id);
CREATE INDEX idx_lane_spin_results_composite ON lane_spin_results(game_id, member_id);

-- Enable RLS
ALTER TABLE lane_spin_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view spin results
CREATE POLICY "Anyone can view lane spin results"
ON lane_spin_results FOR SELECT
TO public
USING (true);

-- Members can create their own spin result
CREATE POLICY "Members can create own spin result"
ON lane_spin_results FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = lane_spin_results.member_id
    AND members.user_id = auth.uid()
  )
);

-- Admins can manage all spin results
CREATE POLICY "Admins can manage all spin results"
ON lane_spin_results FOR ALL
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

COMMENT ON TABLE lane_spin_results IS 'Track which members have spun the wheel and got their lane assignments';
COMMENT ON COLUMN lane_spin_results.spun_at IS 'Timestamp when member spun the wheel';