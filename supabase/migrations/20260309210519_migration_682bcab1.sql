-- Fix lane_configurations RLS policies
DROP POLICY IF EXISTS "Admins can manage lane configurations" ON lane_configurations;
DROP POLICY IF EXISTS "Anyone can view lane configurations" ON lane_configurations;

CREATE POLICY "Admin full access to lane_configurations"
  ON lane_configurations
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = get_current_member_id() 
      AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view lane_configurations"
  ON lane_configurations
  FOR SELECT
  TO public
  USING (true);