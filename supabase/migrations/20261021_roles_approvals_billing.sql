-- SignalSafe role, approval, and billing model
-- Run this migration in the Supabase SQL editor before testing the new workflows.

alter table public.profiles
  add column if not exists role text not null default 'client' check (role in ('client', 'admin')),
  add column if not exists created_at timestamptz not null default now();

update public.profiles set role = 'admin'
where lower(email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com');

create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when lower(new.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com') then 'admin' else 'client' end
  ) on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure public.handle_new_profile();

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('draft', 'pending_approval', 'sent', 'rejected'));
alter table public.campaigns
  add column if not exists requested_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists rejection_reason text;

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text unique,
  plan text not null check (plan in ('starter', 'growth', 'enterprise')),
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
create policy "Users view own orders" on public.orders for select using (auth.uid() = user_id);

-- Admin helpers use the two protected course-project accounts.
create or replace function public.is_signalsafe_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in
    ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com')
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_signalsafe_admin() then
    raise exception 'Only administrators can change roles';
  end if;
  if lower(old.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com') and new.role <> 'admin' then
    raise exception 'Protected administrators cannot be demoted';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before update on public.profiles
for each row execute procedure public.protect_profile_role();

create policy "Admins view all profiles" on public.profiles for select using (public.is_signalsafe_admin());
create policy "Admins update roles" on public.profiles for update using (public.is_signalsafe_admin()) with check (public.is_signalsafe_admin());
create policy "Admins view all campaigns" on public.campaigns for select using (public.is_signalsafe_admin());
create policy "Admins update all campaigns" on public.campaigns for update using (public.is_signalsafe_admin()) with check (public.is_signalsafe_admin());
create policy "Admins view all groups" on public.groups for select using (public.is_signalsafe_admin());
create policy "Admins view all targets" on public.targets for select using (public.is_signalsafe_admin());
create policy "Admins view all templates" on public.email_templates for select using (public.is_signalsafe_admin());
create policy "Admins create campaign events" on public.events for insert with check (public.is_signalsafe_admin());
create policy "Admins view all events" on public.events for select using (public.is_signalsafe_admin());
