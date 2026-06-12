-- ============================================================================
-- Route employee allocations to the creating executive's manager, and enforce
-- visibility with RLS (admin / creator / assigned manager / the employee).
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.employee_allocations add column if not exists manager_id    uuid references public.profiles(id)    on delete set null;
alter table public.employee_allocations add column if not exists department_id uuid references public.departments(id) on delete set null;

-- Replace permissive policies with role/mapping-aware ones.
drop policy if exists alloc_read  on public.employee_allocations;
drop policy if exists alloc_write on public.employee_allocations;

-- SELECT: admin, the executive who created it, the assigned manager, or the
-- employee it belongs to (matched by their Employee ID).
create policy alloc_select on public.employee_allocations
  for select to authenticated
  using (
    public.current_role() = 'admin'
    or created_by = auth.uid()
    or manager_id = auth.uid()
    or employee_id = (select employee_id from public.profiles where id = auth.uid())
  );

-- INSERT: any staff member (executive raising the allocation).
create policy alloc_insert on public.employee_allocations
  for insert to authenticated
  with check (public.current_role() in ('admin','manager','executive'));

-- UPDATE: admin, assigned manager (approve/reject), creator, or the employee
-- (accept / mark received).
create policy alloc_update on public.employee_allocations
  for update to authenticated
  using (
    public.current_role() = 'admin'
    or manager_id = auth.uid()
    or created_by = auth.uid()
    or employee_id = (select employee_id from public.profiles where id = auth.uid())
  )
  with check (true);

-- DELETE: admin or creator.
create policy alloc_delete on public.employee_allocations
  for delete to authenticated
  using (public.current_role() = 'admin' or created_by = auth.uid());

select policyname, cmd from pg_policies
where schemaname='public' and tablename='employee_allocations' order by policyname;
