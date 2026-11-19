-- ZT Iran Hub: اسکیمای اولیه با ایزوله‌سازی تننت‌ها (RLS)
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select from pg_roles where rolname = 'zt_app') then
    create role zt_app login password 'zt_app_password';
  end if;
end $$;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','analyst','viewer')),
  primary key (tenant_id, user_id)
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  platform text not null,            -- woocommerce, csv, ...
  base_url text,
  created_at timestamptz not null default now()
);

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  credentials_enc text not null,     -- رمزنگاری‌شده؛ هرگز متن ساده
  status text not null default 'pending',
  last_synced_at timestamptz,
  last_error text
);

create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,
  title text not null,
  price_rial bigint,
  unique (tenant_id, store_id, external_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,         -- فقط شناسه؛ داده شخصی ذخیره نمی‌شود
  unique (tenant_id, store_id, external_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,
  status text not null,              -- paid, pending, cancelled, refunded
  total_rial bigint not null,
  refunded_rial bigint not null default 0,
  customer_external_id text,
  placed_at timestamptz not null,
  unique (tenant_id, store_id, external_id)
);
create index on orders (tenant_id, placed_at);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_external_id text,
  title text,
  quantity int not null,
  total_rial bigint not null
);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  error text
);

create table audit_log (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- RLS: هر جدول متعلق به تننت فقط ردیف‌های تننت جاری را نشان می‌دهد
do $$
declare t text;
begin
  foreach t in array array['memberships','stores','integration_connections','products',
    'customers','orders','order_items','sync_runs','audit_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$create policy tenant_isolation on %I
      using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
      with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  end loop;
end $$;

grant usage on schema public to zt_app;
grant select, insert, update, delete on all tables in schema public to zt_app;
grant usage, select on all sequences in schema public to zt_app;
