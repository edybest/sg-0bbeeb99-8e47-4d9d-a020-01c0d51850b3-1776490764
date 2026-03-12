CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('all','members','blok_players_by_date')),
  target_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_recipients (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  delivered_at timestamptz NULL,
  read_at timestamptz NULL,
  PRIMARY KEY (notification_id, member_id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Notifications are readable by authenticated users'
  ) THEN
    CREATE POLICY "Notifications are readable by authenticated users"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Admins can create notifications'
  ) THEN
    CREATE POLICY "Admins can create notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.is_admin = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_recipients' AND policyname='Recipients can view their notifications'
  ) THEN
    CREATE POLICY "Recipients can view their notifications"
    ON public.notification_recipients
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = notification_recipients.member_id
          AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_recipients' AND policyname='Admins can create recipients'
  ) THEN
    CREATE POLICY "Admins can create recipients"
    ON public.notification_recipients
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.is_admin = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_recipients' AND policyname='Recipients can mark read'
  ) THEN
    CREATE POLICY "Recipients can mark read"
    ON public.notification_recipients
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = notification_recipients.member_id
          AND m.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = notification_recipients.member_id
          AND m.user_id = auth.uid()
      )
    );
  END IF;
END $$;