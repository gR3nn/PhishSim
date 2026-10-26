-- 7. Landing Pages Table
create table if not exists landing_pages (
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
