create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_mini_blok_share(p_mini_blok_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_member_id uuid;
  v_token text;
begin
  select m.id into v_member_id
  from public.members m
  where m.user_id = auth.uid()
  limit 1;

  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  v_token := replace(extensions.gen_random_uuid()::text, '-', '') || replace(extensions.gen_random_uuid()::text, '-', '');

  insert into public.mini_blok_shares (mini_blok_id, token, created_by_member_id)
  values (p_mini_blok_id, v_token, v_member_id)
  on conflict (mini_blok_id) do update
    set token = excluded.token,
        revoked_at = null,
        expires_at = null,
        last_accessed_at = null,
        created_by_member_id = excluded.created_by_member_id,
        created_at = now();

  return v_token;
end;
$$;

revoke all on function public.generate_mini_blok_share(uuid) from public;
grant execute on function public.generate_mini_blok_share(uuid) to anon, authenticated;