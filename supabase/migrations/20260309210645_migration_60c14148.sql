-- Clean up DUPLICATE policies on lane_assignments
DROP POLICY IF EXISTS "Admins can manage lane assignments" ON lane_assignments;

-- Keep: "Admin full access to lane_assignments", "Anyone can view lane_assignments", "Members can manage their own lane assignments"