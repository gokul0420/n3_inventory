-- ============================================================================
-- Bootstrap the three demo accounts — run in Supabase SQL Editor.
-- Works around email-confirmation + email rate limits by confirming users
-- directly and creating Ajippan via the auth schema.
-- Safe to re-run.
-- ============================================================================

-- 1. Confirm the users already created via the app/API (Bala, Gokul) so they
--    can sign in immediately without clicking a confirmation email.
update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where email in ('balaaditya@gmail.com', 'gokulkrishna0420@gmail.com');

-- 2. Create Ajippan directly (the API call was blocked by the email rate limit).
--    pgcrypto's crypt() produces the same bcrypt hash format Supabase expects.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'gokulbindhuramesh@gmail.com', crypt('ajippan123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Ajippan","role":"executive","avatar":"AJ"}'::jsonb
where not exists (select 1 from auth.users where email = 'gokulbindhuramesh@gmail.com');

-- 3. Email/password sign-in needs a matching identities row. Create one for any
--    of our users that is missing it.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', now(), now(), now()
from auth.users u
where u.email in ('balaaditya@gmail.com','gokulkrishna0420@gmail.com','gokulbindhuramesh@gmail.com')
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- 4. Make sure every profile exists with the right role/status.
--    (The on_auth_user_created trigger normally handles this, but we upsert
--     here to be certain — e.g. for the directly-inserted Ajippan.)
insert into public.profiles (id, name, email, role, status, avatar)
select u.id,
       coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
       u.email,
       coalesce((u.raw_user_meta_data->>'role')::user_role, 'executive'),
       'active',
       coalesce(u.raw_user_meta_data->>'avatar', upper(left(u.email,2)))
from auth.users u
where u.email in ('balaaditya@gmail.com','gokulkrishna0420@gmail.com','gokulbindhuramesh@gmail.com')
on conflict (id) do update
  set role = excluded.role, status = 'active', name = excluded.name;

-- 5. Force correct roles (in case a profile was created earlier with a default).
update public.profiles set role = 'admin'     where email = 'balaaditya@gmail.com';
update public.profiles set role = 'executive' where email = 'gokulkrishna0420@gmail.com';
update public.profiles set role = 'executive' where email = 'gokulbindhuramesh@gmail.com';

-- 6. Verify — this SELECT should return all three with correct roles.
select email, role, status from public.profiles order by role;
