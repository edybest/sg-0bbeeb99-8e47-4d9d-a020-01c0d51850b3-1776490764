-- CRITICAL FIX: Enable RLS on player_reactions_log table
ALTER TABLE player_reactions_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for player_reactions_log
-- Anyone can view reactions
CREATE POLICY "public_read_player_reactions"
  ON player_reactions_log
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert reactions
CREATE POLICY "auth_insert_player_reactions"
  ON player_reactions_log
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);