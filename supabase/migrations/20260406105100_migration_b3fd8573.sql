-- Step 1: Add couple_id column to lane_assignments
ALTER TABLE lane_assignments 
ADD COLUMN couple_id uuid NULL;

-- Step 2: Add foreign key constraint
ALTER TABLE lane_assignments
ADD CONSTRAINT lane_assignments_couple_id_fkey 
FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;

-- Step 3: Make member_id nullable (to support couple assignments)
ALTER TABLE lane_assignments 
ALTER COLUMN member_id DROP NOT NULL;

-- Step 4: Add check constraint - either member_id OR couple_id must be set
ALTER TABLE lane_assignments
ADD CONSTRAINT lane_assignments_member_or_couple_check
CHECK (
  (member_id IS NOT NULL AND couple_id IS NULL) OR
  (member_id IS NULL AND couple_id IS NOT NULL)
);

-- Step 5: Drop old unique constraint and create new one that supports both types
ALTER TABLE lane_assignments
DROP CONSTRAINT IF EXISTS lane_assignments_game_id_member_id_key;

-- Create unique index that allows one assignment per game+member OR one assignment per game+couple
CREATE UNIQUE INDEX lane_assignments_game_member_unique 
ON lane_assignments(game_id, member_id) 
WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX lane_assignments_game_couple_unique 
ON lane_assignments(game_id, couple_id) 
WHERE couple_id IS NOT NULL;

-- Step 6: Add index for couple_id lookups
CREATE INDEX idx_lane_assignments_couple ON lane_assignments(couple_id);

-- Step 7: Update RLS policies to handle both member and couple assignments
-- No changes needed - existing policies already check member_id which can be NULL for couples