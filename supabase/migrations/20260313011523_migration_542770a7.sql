CREATE TABLE IF NOT EXISTS public.nav_layout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_layout_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nav_layout_settings' AND policyname='Public can read nav_layout_settings'
  ) THEN
    CREATE POLICY "Public can read nav_layout_settings"
    ON public.nav_layout_settings
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nav_layout_settings' AND policyname='Admins can write nav_layout_settings'
  ) THEN
    CREATE POLICY "Admins can write nav_layout_settings"
    ON public.nav_layout_settings
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.members m WHERE m.user_id = auth.uid() AND m.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.user_id = auth.uid() AND m.is_admin = true));
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nav_layout_settings_touch_updated_at ON public.nav_layout_settings;
CREATE TRIGGER nav_layout_settings_touch_updated_at
BEFORE UPDATE ON public.nav_layout_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.nav_layout_settings (key, value)
VALUES
  ('member_dashboard_cards', jsonb_build_object(
    'order', jsonb_build_array('blok','fivefive','training','gallery','hall_of_fame','lane','undi_lane','average_score','feedback')
  )),
  ('member_menu', jsonb_build_object(
    'order', jsonb_build_array('dashboard','blok','fivefive','training','gallery','undi_lane','hall_of_fame','average_score','feedback','profile')
  ))
ON CONFLICT (key) DO NOTHING;