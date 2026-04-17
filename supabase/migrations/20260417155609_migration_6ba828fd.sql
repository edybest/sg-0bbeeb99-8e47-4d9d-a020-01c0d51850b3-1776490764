-- Add trio_enabled field to games table
ALTER TABLE games 
ADD COLUMN trio_enabled boolean DEFAULT false;

-- Create trio_records table (similar to double_records but for 3 players)
CREATE TABLE trio_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player1_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    player2_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    player3_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    player1_score integer NOT NULL DEFAULT 0,
    player2_score integer NOT NULL DEFAULT 0,
    player3_score integer NOT NULL DEFAULT 0,
    player1_handicap integer NOT NULL DEFAULT 0,
    player2_handicap integer NOT NULL DEFAULT 0,
    player3_handicap integer NOT NULL DEFAULT 0,
    total_score integer GENERATED ALWAYS AS (player1_score + player2_score + player3_score + player1_handicap + player2_handicap + player3_handicap) STORED,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES members(id),
    updated_at timestamptz DEFAULT now()
);

-- Add RLS policies for trio_records (T2 pattern - public read, admin write)
ALTER TABLE trio_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_trio" ON trio_records FOR SELECT USING (true);
CREATE POLICY "admin_insert_trio" ON trio_records FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "admin_update_trio" ON trio_records FOR UPDATE USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "admin_delete_trio" ON trio_records FOR DELETE USING (
    EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true)
);

-- Add indexes for better performance
CREATE INDEX idx_trio_records_game ON trio_records(game_id);
CREATE INDEX idx_trio_records_total ON trio_records(total_score DESC);
CREATE INDEX idx_trio_records_players ON trio_records(player1_id, player2_id, player3_id);

COMMENT ON TABLE trio_records IS 'Trio team records - 3 players per team';
COMMENT ON COLUMN trio_records.total_score IS 'Total score = player1_score + player2_score + player3_score + all handicaps';