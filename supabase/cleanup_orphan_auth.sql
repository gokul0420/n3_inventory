-- ============================================================================
-- Free up emails that are stuck in Auth with no profile.
-- When an admin "removes" a user we delete their profile row, but the underlying
-- auth.users record can linger and block re-inviting/signing up that email.
-- This deletes any auth user that has NO matching profile (i.e. unusable, since
-- login requires a profile) — which frees those emails for a fresh signup.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

delete from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- Confirm the target email is now free (should return 0 rows):
select email from auth.users where email = 'gokulbindhuramesh@gmail.com';
