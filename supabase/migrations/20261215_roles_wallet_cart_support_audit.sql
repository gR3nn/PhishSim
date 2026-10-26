-- PhishSafe role, wallet, shared-library, support, and audit upgrade.
-- Run after the existing migrations in filename order.

-- Expanded role model.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  case when lower(u.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com') then 'admin' else 'client' end
from auth.users u
on conflict (id) do update set email = excluded.email;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'admin', 'campaign_manager', 'support', 'auditor'));

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) in
      ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com') then 'admin'
    else coalesce((select role from public.profiles where id = auth.uid()), 'client')
  end;
$$;

create or replace function public.is_phishsafe_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_app_role() = 'admin'; $$;

create or replace function public.can_manage_campaigns()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_app_role() in ('admin', 'campaign_manager'); $$;

-- Shared defaults plus per-user overrides. A global edit changes the canonical
-- row; users who have an override continue seeing their own copy.
alter table public.email_templates
  add column if not exists is_default boolean not null default false,
  add column if not exists source_template_id uuid references public.email_templates(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();
alter table public.landing_pages
  add column if not exists is_default boolean not null default false,
  add column if not exists source_template_id uuid references public.landing_pages(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists email_template_one_override_per_user
  on public.email_templates (user_id, source_template_id);
create unique index if not exists landing_page_one_override_per_user
  on public.landing_pages (user_id, source_template_id);

-- Pick one protected owner's seeded library as the canonical library.
with ranked as (
  select t.id, row_number() over (partition by lower(t.name) order by
    case lower(p.email) when 'gradinarumanuel99@gmail.com' then 0 else 1 end,
    t.created_at, t.id) as rn
  from public.email_templates t join public.profiles p on p.id = t.user_id
  where lower(p.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com')
    and lower(t.name) in ('password expiry notice','shared document alert','invoice review request','benefits enrollment','cloud storage warning','unusual sign-in','package delivery','payroll update','meeting invitation','it software update','executive request','survey reward')
)
update public.email_templates t set is_default = true
from ranked r where t.id = r.id and r.rn = 1;

with ranked as (
  select l.id, row_number() over (partition by lower(l.url_slug) order by
    case lower(p.email) when 'gradinarumanuel99@gmail.com' then 0 else 1 end,
    l.created_at, l.id) as rn
  from public.landing_pages l join public.profiles p on p.id = l.user_id
  where lower(p.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com')
    and lower(l.url_slug) in ('microsoft-365-awareness','google-workspace-awareness','document-share-awareness','invoice-portal-awareness','hr-portal-awareness','cloud-storage-awareness','security-alert-awareness','delivery-notice-awareness','payroll-portal-awareness','calendar-invite-awareness','software-update-awareness','survey-reward-awareness')
)
update public.landing_pages l set is_default = true
from ranked r where l.id = r.id and r.rn = 1;

-- Remove unused per-user seed clones. Referenced email rows are preserved as
-- personal overrides so historical campaigns remain valid.
update public.email_templates duplicate set source_template_id = canonical.id
from public.email_templates canonical
where canonical.is_default and not duplicate.is_default
  and lower(duplicate.name) = lower(canonical.name);

delete from public.email_templates duplicate
using public.email_templates canonical
where canonical.is_default and not duplicate.is_default
  and lower(duplicate.name) = lower(canonical.name)
  and coalesce(duplicate.subject, '') = coalesce(canonical.subject, '')
  and coalesce(duplicate.body_html, '') = coalesce(canonical.body_html, '')
  and not exists (select 1 from public.campaigns c where c.template_id = duplicate.id);

delete from public.landing_pages duplicate
using public.landing_pages canonical
where canonical.is_default and not duplicate.is_default
  and lower(duplicate.url_slug) = lower(canonical.url_slug)
  and duplicate.html_content = canonical.html_content;

drop policy if exists "Users can crud own templates" on public.email_templates;
drop policy if exists "Admins view all templates" on public.email_templates;
create policy "Library templates are visible" on public.email_templates for select
  using (is_default or user_id = auth.uid() or public.can_manage_campaigns());
create policy "Users create personal templates" on public.email_templates for insert
  with check (user_id = auth.uid() and not is_default);
create policy "Owners update personal templates" on public.email_templates for update
  using (user_id = auth.uid() and not is_default)
  with check (user_id = auth.uid() and not is_default);
create policy "Managers update default templates" on public.email_templates for update
  using (is_default and public.can_manage_campaigns())
  with check (is_default and public.can_manage_campaigns());
create policy "Owners delete personal templates" on public.email_templates for delete
  using (user_id = auth.uid() and not is_default);

drop policy if exists "Users can crud own landing pages" on public.landing_pages;
drop policy if exists "Public can view landing pages" on public.landing_pages;
create policy "Landing pages are publicly visible" on public.landing_pages for select using (true);
create policy "Users create personal landing pages" on public.landing_pages for insert
  with check (user_id = auth.uid() and not is_default);
create policy "Owners update personal landing pages" on public.landing_pages for update
  using (user_id = auth.uid() and not is_default)
  with check (user_id = auth.uid() and not is_default);
create policy "Managers update default landing pages" on public.landing_pages for update
  using (is_default and public.can_manage_campaigns())
  with check (is_default and public.can_manage_campaigns());
create policy "Owners delete personal landing pages" on public.landing_pages for delete
  using (user_id = auth.uid() and not is_default);

-- Credit wallet. Positive rows fund a wallet, negative rows spend it.
create table if not exists public.credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents <> 0),
  kind text not null check (kind in ('coupon', 'purchase', 'refund', 'adjustment')),
  reference text,
  description text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists credit_coupon_once_per_user
  on public.credit_transactions (user_id, upper(reference)) where kind = 'coupon';
alter table public.credit_transactions enable row level security;
create policy "Users view own wallet" on public.credit_transactions for select using (user_id = auth.uid());

alter table public.orders drop constraint if exists orders_plan_check;
alter table public.orders add constraint orders_plan_check
  check (plan in ('custom', 'starter', 'growth', 'enterprise'));
alter table public.orders
  add column if not exists quantity integer not null default 1,
  add column if not exists recipient_limit integer,
  add column if not exists paid_with text default 'stripe';

-- Support inbox and messages.
create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
create policy "Users read own or staff tickets" on public.support_tickets for select
  using (user_id = auth.uid() or public.current_app_role() in ('admin','campaign_manager','support'));
create policy "Users create own tickets" on public.support_tickets for insert with check (user_id = auth.uid());
create policy "Staff update tickets" on public.support_tickets for update
  using (public.current_app_role() in ('admin','campaign_manager','support'));
create policy "Users update own tickets" on public.support_tickets for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Participants read ticket messages" on public.support_messages for select using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and
    (t.user_id = auth.uid() or public.current_app_role() in ('admin','campaign_manager','support')))
);
create policy "Participants send ticket messages" on public.support_messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.support_tickets t where t.id = ticket_id and
    (t.user_id = auth.uid() or public.current_app_role() in ('admin','campaign_manager','support')))
);

-- Activity audit trail populated by the authenticated tracking endpoint.
create table if not exists public.activity_logs (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  path text not null,
  label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_user_id_idx on public.activity_logs (user_id, created_at desc);
alter table public.activity_logs enable row level security;
create policy "Managers read activity logs" on public.activity_logs for select using (public.current_app_role() in ('admin','campaign_manager'));

-- Managers can see and approve operational data, while auditors can only read it.
create policy "Managers and auditors view campaigns" on public.campaigns for select
  using (public.current_app_role() in ('campaign_manager','auditor'));
create policy "Managers update campaigns" on public.campaigns for update
  using (public.current_app_role() = 'campaign_manager') with check (public.current_app_role() = 'campaign_manager');
create policy "Managers and auditors view events" on public.events for select
  using (public.current_app_role() in ('campaign_manager','auditor'));
create policy "Managers view groups" on public.groups for select using (public.current_app_role() = 'campaign_manager');
create policy "Managers view targets" on public.targets for select using (public.current_app_role() = 'campaign_manager');
create policy "Managers view profiles" on public.profiles for select using (public.current_app_role() = 'campaign_manager');
create policy "Managers update profile roles" on public.profiles for update
  using (public.current_app_role() = 'campaign_manager') with check (public.current_app_role() = 'campaign_manager');

-- Keep protected owners protected while allowing the expanded roles.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and public.current_app_role() not in ('admin', 'campaign_manager') then
    raise exception 'Only administrators and campaign managers can change roles';
  end if;
  if lower(old.email) in ('gradinarumanuel99@gmail.com', 'alexxperian@gmail.com') and new.role <> 'admin' then
    raise exception 'Protected administrators cannot be demoted';
  end if;
  return new;
end;
$$;
