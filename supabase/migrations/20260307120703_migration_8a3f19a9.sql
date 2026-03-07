-- Add split indicator columns for all 10 frames
ALTER TABLE training_scores
ADD COLUMN frame1_split boolean DEFAULT false,
ADD COLUMN frame2_split boolean DEFAULT false,
ADD COLUMN frame3_split boolean DEFAULT false,
ADD COLUMN frame4_split boolean DEFAULT false,
ADD COLUMN frame5_split boolean DEFAULT false,
ADD COLUMN frame6_split boolean DEFAULT false,
ADD COLUMN frame7_split boolean DEFAULT false,
ADD COLUMN frame8_split boolean DEFAULT false,
ADD COLUMN frame9_split boolean DEFAULT false,
ADD COLUMN frame10_split boolean DEFAULT false;

COMMENT ON COLUMN training_scores.frame1_split IS 'Indicates if frame 1 was a split';
COMMENT ON COLUMN training_scores.frame2_split IS 'Indicates if frame 2 was a split';
COMMENT ON COLUMN training_scores.frame3_split IS 'Indicates if frame 3 was a split';
COMMENT ON COLUMN training_scores.frame4_split IS 'Indicates if frame 4 was a split';
COMMENT ON COLUMN training_scores.frame5_split IS 'Indicates if frame 5 was a split';
COMMENT ON COLUMN training_scores.frame6_split IS 'Indicates if frame 6 was a split';
COMMENT ON COLUMN training_scores.frame7_split IS 'Indicates if frame 7 was a split';
COMMENT ON COLUMN training_scores.frame8_split IS 'Indicates if frame 8 was a split';
COMMENT ON COLUMN training_scores.frame9_split IS 'Indicates if frame 9 was a split';
COMMENT ON COLUMN training_scores.frame10_split IS 'Indicates if frame 10 was a split';