-- Rename the admin helper function to a neutral, product-agnostic name.
-- public.is_signalsafe_admin()  ->  public.is_platform_admin()
--
-- Run this in the Supabase SQL editor — the app cannot run DDL.
-- This migration is additive: it creates the new function, repoints the one
-- dependent trigger function and all nine admin RLS policies to it, and only
-- then drops the old function. RLS behaviour is unchanged; the USING/WITH CHECK
-- expressions are identical aside from the function name.

-- 1. Create the neutrally-named function with the same body/signature.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in
    ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com')
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. Repoint the trigger function at the new helper.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_platform_admin() then
    raise exception 'Only administrators can change roles';
  end if;
  if lower(old.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com') and new.role <> 'admin' then
    raise exception 'Protected administrators cannot be demoted';
  end if;
  return new;
end;
$$;

-- 3. Recreate every admin policy against the new function (verbatim otherwise).
drop policy if exists "Admins view all profiles" on public.profiles;
create policy "Admins view all profiles" on public.profiles for select using (public.is_platform_admin());

drop policy if exists "Admins update roles" on public.profiles;
create policy "Admins update roles" on public.profiles for update using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Admins view all campaigns" on public.campaigns;
create policy "Admins view all campaigns" on public.campaigns for select using (public.is_platform_admin());

drop policy if exists "Admins update all campaigns" on public.campaigns;
create policy "Admins update all campaigns" on public.campaigns for update using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Admins view all groups" on public.groups;
create policy "Admins view all groups" on public.groups for select using (public.is_platform_admin());

drop policy if exists "Admins view all targets" on public.targets;
create policy "Admins view all targets" on public.targets for select using (public.is_platform_admin());

drop policy if exists "Admins view all templates" on public.email_templates;
create policy "Admins view all templates" on public.email_templates for select using (public.is_platform_admin());

drop policy if exists "Admins create campaign events" on public.events;
create policy "Admins create campaign events" on public.events for insert with check (public.is_platform_admin());

drop policy if exists "Admins view all events" on public.events;
create policy "Admins view all events" on public.events for select using (public.is_platform_admin());

-- 4. Drop the old function now that nothing references it.
drop function if exists public.is_signalsafe_admin();
