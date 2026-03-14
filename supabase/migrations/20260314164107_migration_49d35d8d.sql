create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_mini_blok_share(p_mini_blok_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text;
  v_member_id uuid;
begin
  select m.id
    into v_member_id
  from public.members m
  where m.user_id = auth.uid()
  limit 1;

  if v_member_id is null then
    raise exception 'Not authenticated or member profile not found';
  end if;

  v_token := encode(extensions.gen_random_uuid()::bytea, 'hex');

  insert into public.mini_blok_shares(mini_blok_id, token, created_by_member_id, created_at)
  values (p_mini_blok_id, v_token, v_member_id, now())
  on conflict (token) do update set created_at = excluded.created_at;

  return v_token;
end;
$$;

grant execute on function public.generate_mini_blok_share(uuid) to anon, authenticated;