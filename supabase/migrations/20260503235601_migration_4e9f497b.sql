-- Allow member_id to be nullable for participants not in members table
ALTER TABLE public.whatsapp_join_participants
ALTER COLUMN member_id DROP NOT NULL;