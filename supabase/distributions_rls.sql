-- ============================================================================
-- STRICT manager-routing enforcement at the DATABASE level (RLS).
-- After this, the API only ever returns a distribution to:
--   • the admin (all), OR
--   • the executive who submitted it (submitted_by = me), OR
--   • the manager it's routed to (manager_id = me).
-- No other manager can read it — regardless of frontend code.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Replace the old permissive read policy (everyone could read every row).
drop policy if exists dist_read  on public.distributions;
drop policy if exists dist_write on public.distributions;

-- SELECT: admin, the submitter, or the assigned manager only.
create policy dist_select on public.distributions
  for select to authenticated
  using (
    public.current_role() = 'admin'
    or submitted_by = auth.uid()
    or manager_id   = auth.uid()
  );

-- INSERT: any staff member may create (executive raising a request, etc.).
create policy dist_insert on public.distributions
  for insert to authenticated
  with check (public.current_role() in ('admin','manager','executive'));

-- UPDATE: admin, the assigned manager (approve/reject), or the submitter
-- (editing their own draft).
create policy dist_update on public.distributions
  for update to authenticated
  using (
    public.current_role() = 'admin'
    or manager_id   = auth.uid()
    or submitted_by = auth.uid()
  )
  with check (
    public.current_role() = 'admin'
    or manager_id   = auth.uid()
    or submitted_by = auth.uid()
  );

-- DELETE: admin or the submitter only.
create policy dist_delete on public.distributions
  for delete to authenticated
  using (public.current_role() = 'admin' or submitted_by = auth.uid());

-- Quick check: list policies now on the table.
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'distributions'
order by policyname;
