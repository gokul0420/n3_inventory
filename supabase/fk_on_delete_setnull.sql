-- ============================================================================
-- Allow deleting a user (auth account → cascades to profile) even when they're
-- referenced by historical records. Make all profile-referencing FKs
-- ON DELETE SET NULL so those references blank out instead of blocking.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- distributions
alter table public.distributions drop constraint if exists distributions_submitted_by_fkey;
alter table public.distributions add  constraint distributions_submitted_by_fkey
  foreign key (submitted_by) references public.profiles(id) on delete set null;
alter table public.distributions drop constraint if exists distributions_approved_by_fkey;
alter table public.distributions add  constraint distributions_approved_by_fkey
  foreign key (approved_by) references public.profiles(id) on delete set null;

-- reorder_requests
alter table public.reorder_requests drop constraint if exists reorder_requests_requested_by_fkey;
alter table public.reorder_requests add  constraint reorder_requests_requested_by_fkey
  foreign key (requested_by) references public.profiles(id) on delete set null;
alter table public.reorder_requests drop constraint if exists reorder_requests_reviewed_by_fkey;
alter table public.reorder_requests add  constraint reorder_requests_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

-- employee_allocations
alter table public.employee_allocations drop constraint if exists employee_allocations_created_by_fkey;
alter table public.employee_allocations add  constraint employee_allocations_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.employee_allocations drop constraint if exists employee_allocations_approved_by_fkey;
alter table public.employee_allocations add  constraint employee_allocations_approved_by_fkey
  foreign key (approved_by) references public.profiles(id) on delete set null;

-- (manager_id columns + profiles.manager_id were already ON DELETE SET NULL,
--  and profiles.id -> auth.users is ON DELETE CASCADE.)
