create table if not exists public.users (
  id text primary key,
  provider text not null check (provider in ('kakao')),
  provider_user_id text not null,
  nickname text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  constraint users_provider_identity_unique unique (provider, provider_user_id)
);

create table if not exists public.purchase_users (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id),
  product_id uuid not null references public.products(id),
  product_name text not null,
  source text not null,
  purchase_url text not null,
  clicked_at timestamptz not null default now()
);

create index if not exists purchase_users_user_time_idx
  on public.purchase_users (user_id, clicked_at desc);
create index if not exists purchase_users_product_time_idx
  on public.purchase_users (product_id, clicked_at desc);

alter table public.users enable row level security;
alter table public.purchase_users enable row level security;

revoke all on public.users from anon, authenticated;
revoke all on public.purchase_users from anon, authenticated;

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
  insert into public.users (id, provider, provider_user_id, nickname)
  values (v_id, 'kakao', p_provider_user_id, p_nickname)
  on conflict (provider, provider_user_id)
  do update set nickname = excluded.nickname, last_login_at = now();

  return query
  select u.id, u.nickname, u.provider from public.users u where u.id = v_id;
end;
$$;

create or replace function public.record_purchase_click(
  p_user_id text,
  p_product_id uuid,
  p_product_name text,
  p_source text,
  p_purchase_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.purchase_users (
    user_id, product_id, product_name, source, purchase_url
  ) values (
    p_user_id, p_product_id, p_product_name, p_source, p_purchase_url
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.upsert_kakao_user(text, text) from public;
revoke all on function public.record_purchase_click(text, uuid, text, text, text) from public;
grant execute on function public.upsert_kakao_user(text, text) to anon;
grant execute on function public.record_purchase_click(text, uuid, text, text, text) to anon;
