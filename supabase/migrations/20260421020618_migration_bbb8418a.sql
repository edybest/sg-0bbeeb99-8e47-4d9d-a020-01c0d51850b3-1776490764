-- Add is_drawn field to trio_records table to track which trios have been officially drawn
ALTER TABLE trio_records ADD COLUMN IF NOT EXISTS is_drawn BOOLEAN DEFAULT FALSE;

-- Add drawn_at timestamp to track when the trio was drawn
ALTER TABLE trio_records ADD COLUMN IF NOT EXISTS drawn_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_trio_records_is_drawn ON trio_records(is_drawn);