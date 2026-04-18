ALTER TABLE public.double_records
ADD COLUMN IF NOT EXISTS player1_handicap integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_handicap integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS include_handicap boolean NOT NULL DEFAULT true;

ALTER TABLE public.trio_records
ADD COLUMN IF NOT EXISTS include_handicap boolean NOT NULL DEFAULT true;