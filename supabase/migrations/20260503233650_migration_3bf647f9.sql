-- Add payment_note column to store badge text after username
ALTER TABLE public.whatsapp_join_participants
ADD COLUMN IF NOT EXISTS payment_note text;