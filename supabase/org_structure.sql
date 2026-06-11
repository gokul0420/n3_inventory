-- ============================================================================
-- STEP 1: Organizational hierarchy + department-scoped products
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- 1. Departments
create table if not exists public.departments (
  id         uuid primary key default uuid_generate_v4(),
  name       text unique not null,
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;
drop policy if exists dept_read on public.departments;
create policy dept_read on public.departments for select to authenticated using (true);
drop policy if exists dept_admin_all on public.departments;
create policy dept_admin_all on public.departments for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- 2. Hierarchy columns
--    profiles: managers/executives belong to a department; executives also map
--    to one manager.
alter table public.profiles        add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.profiles        add column if not exists manager_id    uuid references public.profiles(id)    on delete set null;

-- invites carry the same mapping so it transfers on signup
alter table public.pending_users   add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.pending_users   add column if not exists manager_id    uuid references public.profiles(id)    on delete set null;

-- products belong to a department
alter table public.stock_items     add column if not exists department_id uuid references public.departments(id) on delete set null;

-- a distribution is routed to one manager (the requester's assigned manager)
alter table public.distributions   add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.distributions   add column if not exists manager_id    uuid references public.profiles(id)    on delete set null;

-- 3. Signup trigger now also copies department_id + manager_id from the invite
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.pending_users where lower(email) = lower(new.email);
  if not found then
    raise exception 'SIGNUP_NOT_INVITED: % must be added by an admin first', new.email;
  end if;

  insert into public.profiles (id, name, email, role, status, avatar, department_id, manager_id)
  values (
    new.id, inv.name, new.email, inv.role, 'active',
    upper(left(regexp_replace(inv.name, '\s', '', 'g'), 2)),
    inv.department_id, inv.manager_id
  )
  on conflict (id) do update
    set name = excluded.name, role = excluded.role, status = 'active',
        department_id = excluded.department_id, manager_id = excluded.manager_id;

  delete from public.pending_users where lower(email) = lower(new.email);
  return new;
end $$;

-- 4. Realtime for departments
do $$ begin
  alter publication supabase_realtime add table public.departments;
exception when duplicate_object then null; end $$;

-- 5. Seed sample departments + department-relevant products
insert into public.departments (name) values ('Hexavarsity'), ('STG')
  on conflict (name) do nothing;

-- Hexavarsity products
insert into public.stock_items (id, code, name, category, location, quantity, threshold, unit, status, department_id)
select v.id, v.id, v.name, 'Merchandise', 'HQ Store', v.qty, v.thr, 'Units', 'active', d.id
from (values
  ('HEX001','Coffee Cup',100,20),
  ('HEX002','Flask',60,15),
  ('HEX003','Wireless Logitech Mouse',80,20),
  ('HEX004','Water Bottle',120,30),
  ('HEX005','T-Shirt',200,40)
) as v(id,name,qty,thr)
cross join (select id from public.departments where name='Hexavarsity') d
on conflict (id) do update set department_id = excluded.department_id;

-- STG products
insert into public.stock_items (id, code, name, category, location, quantity, threshold, unit, status, department_id)
select v.id, v.id, v.name, 'IT Equipment', 'Warehouse A', v.qty, v.thr, 'Units', 'active', d.id
from (values
  ('STG001','Laptop',40,10),
  ('STG002','Power Bank',70,15),
  ('STG003','Onboarding Hamper',50,10),
  ('STG004','Laptop Bag',90,20)
) as v(id,name,qty,thr)
cross join (select id from public.departments where name='STG') d
on conflict (id) do update set department_id = excluded.department_id;

-- 6. Show the result
select d.name as department, count(s.id) as products
from public.departments d
left join public.stock_items s on s.department_id = d.id
group by d.name order by d.name;
