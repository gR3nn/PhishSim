-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Enum for Event Types
create type event_type as enum ('sent', 'opened', 'clicked', 'compromised');

-- 1. Profiles Table (Linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text
);

-- 2. Groups Table (Target Groups)
create table groups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Targets Table (The victims)
create table targets (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references groups(id) on delete cascade not null,
  email text not null,
  name text
);

-- 4. Campaigns Table
create table campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  subject text,
  body_html text,
  status text check (status in ('draft', 'sent')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Events Table (Tracking logs)
create table events (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  target_email text not null,
  event_type event_type not null,
  user_agent text,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table groups enable row level security;
alter table targets enable row level security;
alter table campaigns enable row level security;
alter table events enable row level security;

-- RLS Policies

-- Profiles: Users can view/update their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Groups: Users can CRUD their own groups
create policy "Users can crud own groups" on groups
  for all using (auth.uid() = user_id);

-- Targets: Users can CRUD targets in their groups
-- (Using a join or subquery to check group ownership)
create policy "Users can crud own targets" on targets
  for all using (
    exists (
      select 1 from groups
      where groups.id = targets.group_id
      and groups.user_id = auth.uid()
    )
  );

-- Campaigns: Users can CRUD their own campaigns
create policy "Users can crud own campaigns" on campaigns
  for all using (auth.uid() = user_id);

-- Events: Users can view events for their campaigns
-- (Events are inserted by system/public usually, but for dashboard viewing)
create policy "Users can view own campaign events" on events
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = events.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- Events: Allow public insertion for tracking (opened, clicked, compromised)
-- Ideally this should be restricted to server-side only via Service Role,
-- but for "pixel" tracking which might happen client-side or via public routes,
-- we usually use Service Role in Next.js API routes.
-- However, if we use client-side tracking, we need public insert.
-- The prompt says "Route Handlers for tracking endpoints", so we will use Service Role in Next.js.
-- So no public insert policy needed if we use Service Role.
-- 6. Email Templates Table
create table email_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  subject text,
  body_html text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update Campaigns Table (Add FKs)
-- Note: In a real migration, you would use ALTER TABLE. 
-- For this schema file, we will redefine the table or add comments for the user to run ALTERs.
-- Since this is a setup file, I will modify the original CREATE statement for campaigns above, 
-- but to preserve the file structure and allow incremental running, I will add ALTER statements here.

alter table campaigns add column template_id uuid references email_templates(id);
alter table campaigns add column group_id uuid references groups(id);
alter table campaigns add column landing_page_url text;

-- Enable RLS for Templates
alter table email_templates enable row level security;

-- RLS Policies for Templates
create policy "Users can crud own templates" on email_templates
  for all using (auth.uid() = user_id);

-- 7. Landing Pages Table
create table landing_pages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  url_slug text not null, -- e.g. 'payroll-awareness' -> /l/payroll-awareness
  html_content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, url_slug)
);

-- Enable RLS for Landing Pages
alter table landing_pages enable row level security;

-- RLS Policies for Landing Pages
create policy "Users can crud own landing pages" on landing_pages
  for all using (auth.uid() = user_id);

-- Allow public read access to landing pages (so victims can see them)
create policy "Public can view landing pages" on landing_pages
  for select using (true);
