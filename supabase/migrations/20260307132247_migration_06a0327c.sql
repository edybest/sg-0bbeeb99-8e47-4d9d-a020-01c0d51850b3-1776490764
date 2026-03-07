-- Create lane_configurations table to store lane undian and sebenar mapping
CREATE TABLE lane_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lane_undian TEXT NOT NULL UNIQUE, -- e.g., "1/2", "3/4", "5/6", etc.
  lane_sebenar TEXT NOT NULL, -- e.g., "5/6", "7/8", "9/10", etc.
  position_order INTEGER NOT NULL, -- Order for display (1-8)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lane_assignments table to store member lane assignments per game
CREATE TABLE lane_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lane_position TEXT NOT NULL, -- e.g., "5A", "6B", "14C", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, member_id) -- Each member can only be assigned once per game
);

-- Enable RLS
ALTER TABLE lane_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lane_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lane_configurations
CREATE POLICY "Anyone can view lane configurations" ON lane_configurations FOR SELECT USING (true);
CREATE POLICY "Admins can manage lane configurations" ON lane_configurations FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for lane_assignments
CREATE POLICY "Anyone can view lane assignments" ON lane_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can manage lane assignments" ON lane_assignments FOR ALL USING (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_lane_assignments_game ON lane_assignments(game_id);
CREATE INDEX idx_lane_assignments_member ON lane_assignments(member_id);
CREATE INDEX idx_lane_configurations_order ON lane_configurations(position_order);

-- Insert default lane configurations based on the image
INSERT INTO lane_configurations (lane_undian, lane_sebenar, position_order) VALUES
('1/2', '5/6', 1),
('3/4', '7/8', 2),
('5/6', '9/10', 3),
('7/8', '11/12', 4),
('9/10', '13/14', 5),
('11/12', '11/12', 6),
('13/14', '13/14', 7),
('15/16', '15/16', 8);

COMMENT ON TABLE lane_configurations IS 'Lane undian to sebenar mapping configuration';
COMMENT ON TABLE lane_assignments IS 'Member lane assignments for each game';
COMMENT ON COLUMN lane_assignments.lane_position IS 'Lane position like 5A, 6B, 14C, etc.';