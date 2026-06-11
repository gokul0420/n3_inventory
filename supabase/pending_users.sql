-- ============================================================================
-- Admin-invite flow: users must be pre-added by an admin before they can sign
-- up. Signup only sets their password; their ROLE is whatever the admin chose.
-- Run in Supabase SQL Editor (safe to re-run).
-- ============================================================================

-- 1. Pending invites added by admins (no auth user exists yet).
create table if not exists public.pending_users (
  email      text primary key,
  name       text not null,
  role       user_role not null default 'executive',
  created_at timestamptz not null default now()
);

alter table public.pending_users enable row level security;

drop policy if exists pending_read on public.pending_users;
create policy pending_read on public.pending_users
  for select to authenticated using (true);

drop policy if exists pending_admin_all on public.pending_users;
create policy pending_admin_all on public.pending_users
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- realtime
do $$ begin
  alter publication supabase_realtime add table public.pending_users;
exception when duplicate_object then null; end $$;

-- 2. Replace the signup trigger:
--    - If the email was pre-added by an admin → create the profile using the
--      admin-chosen name/role, then remove the pending invite.
--    - If NOT pre-added → abort signup (rolls back the auth.users insert too,
--      so the email stays free until an admin adds it).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.pending_users where lower(email) = lower(new.email);

  if not found then
    -- Block self-signup for anyone an admin hasn't invited.
    raise exception 'SIGNUP_NOT_INVITED: % must be added by an admin first', new.email;
  end if;

  insert into public.profiles (id, name, email, role, status, avatar)
  values (
    new.id, inv.name, new.email, inv.role, 'active',
    upper(left(regexp_replace(inv.name, '\s', '', 'g'), 2))
  )
  on conflict (id) do update
    set name = excluded.name, role = excluded.role, status = 'active';

  delete from public.pending_users where lower(email) = lower(new.email);
  return new;
end $$;

-- (Trigger on_auth_user_created already points at handle_new_user from schema.sql.)
