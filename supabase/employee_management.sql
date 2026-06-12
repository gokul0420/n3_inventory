-- ============================================================================
-- PHASE 1: Employee management + authentication
-- Admins pre-add employees (with Employee ID); employees sign up with
-- empId+email to set a password, then sign in with empId+email+password.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Invites can now carry an employee_id (profiles already has employee_id).
alter table public.pending_users add column if not exists employee_id text;

-- Signup trigger copies employee_id (and existing dept/manager) into the profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.pending_users where lower(email) = lower(new.email);
  if not found then
    raise exception 'SIGNUP_NOT_INVITED: % must be added by an admin first', new.email;
  end if;

  -- For employees, the Employee ID typed at signup must match the invite.
  if inv.employee_id is not null
     and coalesce(new.raw_user_meta_data->>'employee_id', '') <> inv.employee_id then
    raise exception 'EMPLOYEE_ID_MISMATCH: Employee ID does not match our records';
  end if;

  insert into public.profiles (id, name, email, role, status, avatar, department_id, manager_id, employee_id)
  values (
    new.id, inv.name, new.email, inv.role, 'active',
    upper(left(regexp_replace(inv.name, '\s', '', 'g'), 2)),
    inv.department_id, inv.manager_id, inv.employee_id
  )
  on conflict (id) do update
    set name = excluded.name, role = excluded.role, status = 'active',
        department_id = excluded.department_id, manager_id = excluded.manager_id,
        employee_id = excluded.employee_id;

  delete from public.pending_users where lower(email) = lower(new.email);
  return new;
end $$;

-- Verify
select email, name, role, employee_id from public.pending_users order by created_at desc;
