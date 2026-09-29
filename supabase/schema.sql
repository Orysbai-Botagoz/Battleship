-- Enable extension for UUID generation (if needed by your environment)
create extension if not exists pgcrypto;

-- Profile table (mapped to auth.users id)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique,
  created_at timestamptz not null default now()
);

-- User statistics table
create table if not exists public.user_stats (
  user_id uuid primary key references public.users(id) on delete cascade,
  wins integer not null default 0,
  losses integer not null default 0,
  games_played integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0
);

-- Games table with JSONB board snapshots and history
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('in_progress', 'won', 'lost')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  player_board jsonb not null,
  ai_board jsonb not null,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_games_status on public.games(status);
create index if not exists idx_games_updated_at on public.games(updated_at desc);

-- Row Level Security
alter table public.users enable row level security;
alter table public.user_stats enable row level security;
alter table public.games enable row level security;

-- Policies: users can only access their own rows
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users for select
using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users for update
using (auth.uid() = id);

drop policy if exists "stats_all_own" on public.user_stats;
create policy "stats_all_own"
on public.user_stats for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "games_all_own" on public.games;
create policy "games_all_own"
on public.games for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_games_updated_at on public.games;
create trigger trg_games_updated_at
before update on public.games
for each row
execute function public.handle_updated_at();