-- SECURITY FIX 4: Recreate functions with search_path protection - Batch 1
-- Core user and member management functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_uuid uuid;
BEGIN
  SELECT id INTO member_uuid FROM members WHERE user_id = auth.uid() LIMIT 1;
  RETURN member_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION get_member_id_from_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_uuid uuid;
BEGIN
  SELECT id INTO member_uuid FROM members WHERE user_id = auth.uid() LIMIT 1;
  RETURN member_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_member_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_uuid uuid;
BEGIN
  SELECT id INTO member_uuid FROM members WHERE user_id = auth.uid();
  IF member_uuid IS NULL THEN
    RAISE EXCEPTION 'Member does not exist for user_id: %', auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_make_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count integer;
BEGIN
  SELECT COUNT(*) INTO member_count FROM members;
  IF member_count = 1 THEN
    UPDATE members SET is_admin = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_join_lobby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lobby_members WHERE member_id = NEW.id) THEN
    INSERT INTO lobby_members (member_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER after_member_insert
  AFTER INSERT ON members
  FOR EACH ROW EXECUTE FUNCTION auto_make_admin();

CREATE TRIGGER after_member_insert_lobby
  AFTER INSERT ON members
  FOR EACH ROW EXECUTE FUNCTION auto_join_lobby();