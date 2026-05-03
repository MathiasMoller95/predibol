-- API-Football integration setup
-- - Adds mapping tables for API team IDs and fixture IDs
-- - Adds match sync/override columns to matches
-- - Adds sync state table for Super Admin status UI
-- - Updates the finished-match scoring trigger to not auto-trigger for API-sourced updates

-- Mapping table: API-Football team IDs → Predibol team names
create table if not exists public.api_football_teams (
  api_team_id integer primary key,
  team_name text not null unique,
  api_team_name text
);

-- Mapping table: API-Football fixture IDs → Predibol match IDs
create table if not exists public.api_football_fixtures (
  api_fixture_id integer primary key,
  match_id uuid not null unique references public.matches(id),
  last_synced_at timestamptz
);

-- Sync columns for live display + audit
alter table public.matches
  add column if not exists match_minute text,
  add column if not exists api_fixture_id integer,
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'api')),
  add column if not exists manual_override boolean not null default false,
  add column if not exists needs_scoring boolean not null default false;

-- Singleton state row for sync status (Super Admin)
create table if not exists public.api_football_sync_state (
  id integer primary key default 1,
  last_sync_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  api_calls_remaining integer,
  next_planned_poll_seconds integer,
  updated_at timestamptz not null default now(),
  constraint api_football_sync_state_singleton check (id = 1)
);

insert into public.api_football_sync_state (id)
values (1)
on conflict (id) do nothing;

-- Update existing scoring trigger to avoid double-triggering when sync-matches
-- explicitly calls score-match on API-sourced finishes.
drop trigger if exists trg_matches_finished_score on public.matches;
create trigger trg_matches_finished_score
after update of status, home_score, away_score on public.matches
for each row
when (
  new.status = 'finished'
  and old.status is distinct from 'finished'
  and new.home_score is not null
  and new.away_score is not null
  and (new.source is distinct from 'api')
)
execute procedure public.notify_score_match_on_match_finished();

