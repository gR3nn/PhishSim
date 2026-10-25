-- Run this in the Supabase SQL editor before testing — the app cannot run DDL.
-- Adds a nullable Stripe customer id so the Billing Portal can resolve a user's
-- subscription and webhook cancellation events can match existing orders.

alter table public.orders add column if not exists stripe_customer_id text;
