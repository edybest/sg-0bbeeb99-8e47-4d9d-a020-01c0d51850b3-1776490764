-- Clean up DUPLICATE policies on fivefive_participants
DROP POLICY IF EXISTS "Admins can manage fivefive participants" ON fivefive_participants;

-- Keep: "Admin full access to fivefive_participants", "Anyone can view fivefive_participants", "Members can manage their own fivefive participation"