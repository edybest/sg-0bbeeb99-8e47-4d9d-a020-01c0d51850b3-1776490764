-- Create table for dynamic WhatsApp commands
CREATE TABLE IF NOT EXISTS public.whatsapp_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_key text NOT NULL UNIQUE,
  command_trigger text NOT NULL,
  response_message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.whatsapp_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active commands"
  ON public.whatsapp_commands
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage commands"
  ON public.whatsapp_commands
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default commands as examples
INSERT INTO public.whatsapp_commands (command_key, command_trigger, response_message, is_active, is_hidden, description)
VALUES
  ('help', '#help', '📋 *AMBC CLUB - WhatsApp Commands*\n\nTaip command untuk lihat senarai penuh.', true, false, 'Show all available commands'),
  ('theboy', '#theboy', 'ambc the boy always wins!!!', true, true, 'Hidden easter egg command')
ON CONFLICT (command_key) DO NOTHING;