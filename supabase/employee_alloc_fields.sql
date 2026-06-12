-- ============================================================================
-- Phase 3 enhancements: executive-entered receiving location + expected date.
-- (collection_location already exists; add expected_by.) Run in SQL Editor.
-- ============================================================================
alter table public.employee_allocations add column if not exists expected_by date;
