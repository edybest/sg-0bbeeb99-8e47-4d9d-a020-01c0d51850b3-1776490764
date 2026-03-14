create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_mini_blok_share(p_mini_blok_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text;
begin
  v_token := replace(extensions.gen_random_uuid()::text, '-', '');

  insert into public.mini_blok_shares(mini_blok_id, token, created_at)
  values (p_mini_blok_id, v_token, now())
  on conflict (token) do update set created_at = excluded.created_at;

  return v_token;
end;
$$;

grant execute on function public.generate_mini_blok_share(uuid) to anon, authenticated;