-- Orders entitlements: widen plan options and add billing/credit tracking
-- Run this in the Supabase SQL editor before testing (the app cannot run DDL).

alter table public.orders drop constraint if exists orders_plan_check;
alter table public.orders add constraint orders_plan_check
  check (plan in ('single', 'starter', 'growth', 'enterprise'));

alter table public.orders
  add column if not exists billing_type text,
  add column if not exists period_start timestamptz,
  add column if not exists credit_consumed boolean not null default false;

update public.orders
  set billing_type = case when plan = 'single' then 'one-time' else 'monthly' end
  where billing_type is null;

create index if not exists orders_user_id_status_idx on public.orders (user_id, status);
