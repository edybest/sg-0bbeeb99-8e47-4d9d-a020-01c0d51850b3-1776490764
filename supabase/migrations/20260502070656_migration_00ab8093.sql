ALTER TABLE public.whatsapp_join_participants
ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;