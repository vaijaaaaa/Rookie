-- Create the first admin account. Run once in the Supabase SQL editor
-- AFTER all migrations. Replace the password below before running —
-- do not commit your real password.
select public.admin_create_user(
  'vaijuwalker111@gmail.com',
  'Vaijnath Patil',
  'REPLACE_WITH_A_STRONG_PASSWORD',
  'admin'
);

-- Already have an account with this email? Promote it and set a password instead:
-- update public.profiles set role = 'admin', onboarded_at = coalesce(onboarded_at, now())
--  where email = 'vaijuwalker111@gmail.com';
-- select public.admin_set_password(
--   (select id from auth.users where email = 'vaijuwalker111@gmail.com'), 'REPLACE_WITH_A_STRONG_PASSWORD');
