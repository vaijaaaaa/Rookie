-- =============================================================================
-- Rookie — admin-managed accounts (no self-service signup)
--
-- Accounts are created only by admins through these functions. They write
-- auth.users/auth.identities directly (same shape GoTrue uses), so no
-- service-role key is needed in the app. Each function checks is_admin();
-- when run from the SQL editor (no auth.uid()) they are allowed, which is how
-- the first admin is bootstrapped.
--
-- ALSO REQUIRED (dashboard): Authentication → Sign In / Providers →
-- turn OFF "Allow new users to sign up", and disable the Google provider.
-- That stops anyone calling the public signup API directly.
-- Safe to re-run.
-- =============================================================================

create or replace function public.assert_admin_or_service()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_create_user(
  p_email text, p_full_name text, p_password text, p_role public.user_role default 'student'
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid := gen_random_uuid();
begin
  perform public.assert_admin_or_service();

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if coalesce(length(p_password), 0) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  if p_role not in ('student', 'admin') then
    raise exception 'Role must be student or admin';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with this email already exists' using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1))),
    now(), now(), '', '', '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email', now(), now());

  -- handle_new_user created the profile; set the role. Admins skip onboarding.
  update public.profiles
     set role = p_role,
         onboarded_at = case when p_role = 'admin' then now() else null end
   where id = v_id;

  return v_id;
end $$;

create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.assert_admin_or_service();
  if coalesce(length(p_password), 0) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
  if not found then raise exception 'User not found'; end if;
end $$;

create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin_or_service();
  if p_user = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;
  delete from auth.users where id = p_user;  -- cascades to profile and all user data
  if not found then raise exception 'User not found'; end if;
end $$;

revoke execute on function public.admin_create_user(text, text, text, public.user_role) from public, anon;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
revoke execute on function public.assert_admin_or_service() from public, anon;
grant execute on function public.admin_create_user(text, text, text, public.user_role) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
