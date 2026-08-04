create or replace function public.upsert_kakao_user(
  p_provider_user_id text,
  p_nickname text
)
returns table(id text, nickname text, provider text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := 'kakao-' || p_provider_user_id;
begin
  insert into public.users as target (id, provider, provider_user_id, nickname)
  values (v_id, 'kakao', p_provider_user_id, p_nickname)
  on conflict on constraint users_provider_identity_unique
  do update set
    nickname = excluded.nickname,
    last_login_at = now();

  return query
  select u.id, u.nickname, u.provider
  from public.users as u
  where u.id = v_id;
end;
$$;

revoke all on function public.upsert_kakao_user(text, text) from public;
grant execute on function public.upsert_kakao_user(text, text) to anon;
