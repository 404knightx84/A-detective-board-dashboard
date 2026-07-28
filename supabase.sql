-- Run this once in your Supabase project's SQL editor to enable the
-- optional backend persistence (see src/lib/storage.js and README.md).

create table if not exists case_boards (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Row Level Security: open for this single-board demo.
-- For a real multi-user app, add a user_id column and scope policies to auth.uid().
alter table case_boards enable row level security;

create policy "Allow anonymous read/write on case_boards"
  on case_boards
  for all
  using (true)
  with check (true);
