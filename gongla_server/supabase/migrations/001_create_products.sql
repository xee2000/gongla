create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  name text not null,
  original_price bigint check (original_price is null or original_price >= 0),
  sale_price bigint check (sale_price is null or sale_price >= 0),
  source text not null check (
    source in ('youtube', 'naver_smartstore', 'instagram', 'shopping_mall', 'other')
  ),
  source_name text,
  image_url text,
  sale_start_at timestamptz not null,
  sale_end_at timestamptz not null,
  purchase_url text not null,
  source_url text,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'active', 'ended')
  ),
  raw_data jsonb not null default '{}'::jsonb,
  last_crawled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_valid_sale_period check (sale_end_at > sale_start_at),
  constraint products_source_external_unique unique (source, external_id)
);

create index if not exists products_status_end_idx
  on public.products (status, sale_end_at);
create index if not exists products_source_status_idx
  on public.products (source, status);
create index if not exists products_start_end_idx
  on public.products (sale_start_at, sale_end_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products
for select
to anon, authenticated
using (
  status = 'active'
  and sale_start_at <= now()
  and sale_end_at > now()
);

-- INSERT/UPDATE 정책은 의도적으로 공개하지 않습니다.
-- NestJS 서버의 SUPABASE_SERVICE_ROLE_KEY만 RLS를 우회해 수집 결과를 저장합니다.
