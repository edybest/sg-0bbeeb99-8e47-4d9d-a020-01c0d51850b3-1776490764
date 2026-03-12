-- Fix the table relationship (drop and recreate properly)
DROP TABLE IF EXISTS member_feedback;

CREATE TABLE member_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('cadangan', 'ralat_sistem', 'pertanyaan_lain')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'resolved')),
  admin_reply TEXT NULL,
  replied_at TIMESTAMP WITH TIME ZONE NULL,
  replied_by UUID NULL REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add comments
COMMENT ON TABLE member_feedback IS 'Member feedback submissions (suggestions, bugs, questions)';
COMMENT ON COLUMN member_feedback.category IS 'Type of feedback: cadangan (suggestion), ralat_sistem (bug), pertanyaan_lain (other questions)';
COMMENT ON COLUMN member_feedback.status IS 'Processing status: pending, read, resolved';

-- Create indexes
CREATE INDEX idx_feedback_member ON member_feedback(member_id);
CREATE INDEX idx_feedback_status ON member_feedback(status);
CREATE INDEX idx_feedback_category ON member_feedback(category);
CREATE INDEX idx_feedback_created ON member_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE member_feedback ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_member_feedback_updated_at
  BEFORE UPDATE ON member_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();