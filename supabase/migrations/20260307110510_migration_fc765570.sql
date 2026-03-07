-- Create training_scores table for members to track their bowling practice
CREATE TABLE training_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  training_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT NULL,
  notes TEXT NULL,
  
  -- Frame-by-frame scores (10 frames)
  frame1 INTEGER NULL CHECK (frame1 >= 0 AND frame1 <= 30),
  frame2 INTEGER NULL CHECK (frame2 >= 0 AND frame2 <= 30),
  frame3 INTEGER NULL CHECK (frame3 >= 0 AND frame3 <= 30),
  frame4 INTEGER NULL CHECK (frame4 >= 0 AND frame4 <= 30),
  frame5 INTEGER NULL CHECK (frame5 >= 0 AND frame5 <= 30),
  frame6 INTEGER NULL CHECK (frame6 >= 0 AND frame6 <= 30),
  frame7 INTEGER NULL CHECK (frame7 >= 0 AND frame7 <= 30),
  frame8 INTEGER NULL CHECK (frame8 >= 0 AND frame8 <= 30),
  frame9 INTEGER NULL CHECK (frame9 >= 0 AND frame9 <= 30),
  frame10 INTEGER NULL CHECK (frame10 >= 0 AND frame10 <= 30),
  
  -- Calculated fields
  total_score INTEGER NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_scores ENABLE ROW LEVEL SECURITY;

-- Members can view their own training scores
CREATE POLICY "Members can view own training scores" ON training_scores
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

-- Members can insert their own training scores
CREATE POLICY "Members can insert own training scores" ON training_scores
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

-- Members can update their own training scores
CREATE POLICY "Members can update own training scores" ON training_scores
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

-- Members can delete their own training scores
CREATE POLICY "Members can delete own training scores" ON training_scores
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM members WHERE id = member_id));

-- Admins can manage all training scores
CREATE POLICY "Admins can manage all training scores" ON training_scores
  FOR ALL USING (is_admin(auth.uid()));

-- Create indexes for better query performance
CREATE INDEX idx_training_scores_member ON training_scores(member_id);
CREATE INDEX idx_training_scores_date ON training_scores(training_date DESC);

-- Add comment
COMMENT ON TABLE training_scores IS 'Personal training scores for members to track their bowling practice';