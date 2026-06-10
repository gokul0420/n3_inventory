-- ============================================================================
-- Mavericks Inventory — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'manager', 'executive', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'pending', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dist_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. profiles  (1:1 with auth.users — holds role/status/display info)
--    auth.users is managed by Supabase Auth; we mirror app-level fields here.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        user_role not null default 'executive',
  status      user_status not null default 'active',
  avatar      text,
  employee_id text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. stock_items
-- ---------------------------------------------------------------------------
create table if not exists public.stock_items (
  id          text primary key,          -- keep human codes like 'STK001'
  code        text,
  name        text not null,
  category    text not null,
  location    text,
  quantity    integer not null default 0,
  threshold   integer not null default 0,
  unit        text default 'Units',
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. distributions
-- ---------------------------------------------------------------------------
create table if not exists public.distributions (
  id               text primary key,     -- e.g. 'DST017'
  stock_id         text references public.stock_items(id) on delete set null,
  stock_name       text,
  quantity         integer not null,
  recipient        text,
  date             date,
  status           dist_status not null default 'draft',
  remarks          text,
  rejection_reason text,
  submitted_by     uuid references public.profiles(id),
  submitted_at     timestamptz,
  approved_by      uuid references public.profiles(id),
  approved_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. reorder_requests
-- ---------------------------------------------------------------------------
create table if not exists public.reorder_requests (
  id               text primary key,
  stock_id         text references public.stock_items(id) on delete set null,
  stock_name       text,
  current_stock    integer,
  ai_threshold     integer,
  suggested_qty    integer,
  requested_qty    integer,
  status           text not null default 'pending',
  requested_by     uuid references public.profiles(id),
  requested_by_name text,
  request_date     timestamptz default now(),
  remarks          text,
  ai_reasoning     text,
  ai_confidence    integer,
  urgency          text default 'standard',
  reviewed_by      uuid references public.profiles(id),
  reviewed_by_name text,
  reviewed_at      timestamptz,
  rejection_reason text
);

-- ---------------------------------------------------------------------------
-- 6. employee_allocations
-- ---------------------------------------------------------------------------
create table if not exists public.employee_allocations (
  id                       text primary key,
  stock_id                 text references public.stock_items(id) on delete set null,
  stock_name               text,
  quantity                 integer not null,
  employee_id              text,
  employee_email           text,
  employee_name            text,
  purpose                  text,
  status                   text not null default 'pending_approval',
  created_by               uuid references public.profiles(id),
  created_at               timestamptz default now(),
  approved_by              uuid references public.profiles(id),
  approved_at              timestamptz,
  rejection_reason         text,
  accepted_at              timestamptz,
  employee_rejection_reason text,
  collection_location      text,
  received_at              timestamptz
);

-- ---------------------------------------------------------------------------
-- 7. audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  entity_type text not null,
  entity_id   text,
  action      text not null,
  "user"      text,
  date        timestamptz not null default now(),
  remarks     text
);

-- ---------------------------------------------------------------------------
-- 8. notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  title      text not null,
  message    text,
  type       text default 'info',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 9. updated_at trigger for stock_items
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_stock_updated_at on public.stock_items;
create trigger trg_stock_updated_at
  before update on public.stock_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 10. New-user hook: auto-create a profile row when someone signs up.
--     Reads name/role from the signup metadata (raw_user_meta_data).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role, status, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'executive'),
    'active',
    coalesce(new.raw_user_meta_data->>'avatar',
             upper(left(coalesce(new.raw_user_meta_data->>'name', new.email),2)))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 11. Role helper (avoids RLS recursion when checking the caller's role)
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 12. Row Level Security
--     Strategy: any authenticated user can READ inventory data (the app is an
--     internal tool). WRITES are role-gated. Tighten further as needed.
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.stock_items         enable row level security;
alter table public.distributions       enable row level security;
alter table public.reorder_requests    enable row level security;
alter table public.employee_allocations enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.notifications       enable row level security;

-- profiles: everyone authenticated can read; users update their own row;
-- admins manage all.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.current_role() = 'admin');

-- Generic helper macro repeated per table: read=all authenticated, write=staff.
-- (executives create distributions; managers/admins approve.)
drop policy if exists stock_read on public.stock_items;
create policy stock_read on public.stock_items
  for select to authenticated using (true);
drop policy if exists stock_write on public.stock_items;
create policy stock_write on public.stock_items
  for all to authenticated
  using (public.current_role() in ('admin','manager','executive'))
  with check (public.current_role() in ('admin','manager','executive'));

drop policy if exists dist_read on public.distributions;
create policy dist_read on public.distributions
  for select to authenticated using (true);
drop policy if exists dist_write on public.distributions;
create policy dist_write on public.distributions
  for all to authenticated
  using (public.current_role() in ('admin','manager','executive'))
  with check (public.current_role() in ('admin','manager','executive'));

drop policy if exists reorder_read on public.reorder_requests;
create policy reorder_read on public.reorder_requests
  for select to authenticated using (true);
drop policy if exists reorder_write on public.reorder_requests;
create policy reorder_write on public.reorder_requests
  for all to authenticated
  using (public.current_role() in ('admin','manager','executive'))
  with check (public.current_role() in ('admin','manager','executive'));

drop policy if exists alloc_read on public.employee_allocations;
create policy alloc_read on public.employee_allocations
  for select to authenticated using (true);
drop policy if exists alloc_write on public.employee_allocations;
create policy alloc_write on public.employee_allocations
  for all to authenticated
  using (public.current_role() in ('admin','manager','executive'))
  with check (public.current_role() in ('admin','manager','executive'));

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs
  for select to authenticated using (true);
drop policy if exists audit_write on public.audit_logs;
create policy audit_write on public.audit_logs
  for insert to authenticated with check (true);

drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications
  for select to authenticated using (true);
drop policy if exists notif_write on public.notifications;
create policy notif_write on public.notifications
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 13. Realtime: add tables to the supabase_realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.stock_items;
  alter publication supabase_realtime add table public.distributions;
  alter publication supabase_realtime add table public.reorder_requests;
  alter publication supabase_realtime add table public.employee_allocations;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- DONE. Next: run seed.sql to load the demo inventory rows (optional).
-- ============================================================================
