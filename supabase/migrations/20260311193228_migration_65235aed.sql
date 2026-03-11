-- Drop old mini_blok table and create new structure
DROP TABLE IF EXISTS mini_blok CASCADE;
DROP TABLE IF EXISTS mini_blok_players CASCADE;
DROP TABLE IF EXISTS mini_blok_collaborators CASCADE;

-- Main mini blok entry (tournament/session)
CREATE TABLE mini_blok (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  location TEXT DEFAULT 'Daiman Bowl',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  owner_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  num_games INTEGER NOT NULL DEFAULT 1 CHECK (num_games >= 1 AND num_games <= 20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players in mini blok (up to 48 players per entry)
CREATE TABLE mini_blok_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mini_blok_id UUID NOT NULL REFERENCES mini_blok(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  handicap INTEGER DEFAULT 0,
  scores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborators who can edit (shared access)
CREATE TABLE mini_blok_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mini_blok_id UUID NOT NULL REFERENCES mini_blok(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mini_blok_id, member_id)
);

-- RLS Policies for mini_blok
ALTER TABLE mini_blok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mini blok entries"
  ON mini_blok FOR SELECT
  USING (true);

CREATE POLICY "Members can create mini blok entries"
  ON mini_blok FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM members));

CREATE POLICY "Owner and collaborators can update mini blok"
  ON mini_blok FOR UPDATE
  USING (
    owner_id IN (SELECT id FROM members WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM mini_blok_collaborators 
      WHERE mini_blok_id = id 
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Only owner can delete mini blok"
  ON mini_blok FOR DELETE
  USING (owner_id IN (SELECT id FROM members WHERE id = auth.uid()));

-- RLS Policies for mini_blok_players
ALTER TABLE mini_blok_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mini blok players"
  ON mini_blok_players FOR SELECT
  USING (true);

CREATE POLICY "Owner and collaborators can insert players"
  ON mini_blok_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      WHERE mb.id = mini_blok_id
      AND (
        mb.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mini_blok_collaborators
          WHERE mini_blok_id = mb.id AND member_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Owner and collaborators can update players"
  ON mini_blok_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      WHERE mb.id = mini_blok_id
      AND (
        mb.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mini_blok_collaborators
          WHERE mini_blok_id = mb.id AND member_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Owner and collaborators can delete players"
  ON mini_blok_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok mb
      WHERE mb.id = mini_blok_id
      AND (
        mb.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mini_blok_collaborators
          WHERE mini_blok_id = mb.id AND member_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for mini_blok_collaborators
ALTER TABLE mini_blok_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collaborators"
  ON mini_blok_collaborators FOR SELECT
  USING (true);

CREATE POLICY "Only owner can add collaborators"
  ON mini_blok_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_blok
      WHERE id = mini_blok_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Only owner can remove collaborators"
  ON mini_blok_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM mini_blok
      WHERE id = mini_blok_id AND owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_mini_blok_owner ON mini_blok(owner_id);
CREATE INDEX idx_mini_blok_date ON mini_blok(date DESC);
CREATE INDEX idx_mini_blok_players_entry ON mini_blok_players(mini_blok_id);
CREATE INDEX idx_mini_blok_collaborators_entry ON mini_blok_collaborators(mini_blok_id);
CREATE INDEX idx_mini_blok_collaborators_member ON mini_blok_collaborators(member_id);

-- Update timestamp triggers
CREATE TRIGGER update_mini_blok_updated_at
  BEFORE UPDATE ON mini_blok
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mini_blok_players_updated_at
  BEFORE UPDATE ON mini_blok_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Constraint to limit players per mini blok (48 max)
CREATE OR REPLACE FUNCTION check_mini_blok_player_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM mini_blok_players WHERE mini_blok_id = NEW.mini_blok_id) >= 48 THEN
    RAISE EXCEPTION 'Maximum 48 players per mini blok entry';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER enforce_mini_blok_player_limit
  BEFORE INSERT ON mini_blok_players
  FOR EACH ROW
  EXECUTE FUNCTION check_mini_blok_player_limit();