-- Clean up DUPLICATE policies on games
DROP POLICY IF EXISTS "Admins can manage games" ON games;

-- Keep: "Admin full access to games", "Anyone can view games"