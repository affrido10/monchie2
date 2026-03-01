-- Выполни в Supabase SQL Editor

create table if not exists public.diary_sessions (
  id text primary key,
  date text not null,
  language_code text not null default 'other',
  custom_language text,
  activity_type text not null,
  duration_minutes integer not null default 30,
  mood integer not null default 3,
  notes text default '',
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.diary_sessions enable row level security;

create policy "Allow all" on public.diary_sessions
  for all using (true) with check (true);
