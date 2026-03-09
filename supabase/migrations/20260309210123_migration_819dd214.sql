-- Update games table RLS policies
DROP POLICY IF EXISTS "Anyone can view games" ON games;
DROP POLICY IF EXISTS "Admin can insert games" ON games;
DROP POLICY IF EXISTS "Admin can update games" ON games;
DROP POLICY IF EXISTS "Admin can delete games" ON games;

-- New optimized policies
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Admin full access to games"
  ON games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );