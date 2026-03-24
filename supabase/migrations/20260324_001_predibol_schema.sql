-- Predibol baseline schema
-- Run this file in Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_phase') then
    create type public.match_phase as enum ('group', 'round_of_16', 'quarter', 'semi', 'final');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type public.match_status as enum ('scheduled', 'live', 'finished');
  end if;

  if not exists (select 1 from pg_type where typname = 'tiebreaker_rule') then
    create type public.tiebreaker_rule as enum (
      'most_exact_scores',
      'most_correct_results',
      'earliest_submission'
    );
  end if;
end
$$;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  primary_color text,
  secondary_color text,
  logo_url text,
  admin_id uuid not null references auth.users(id) on delete restrict,
  points_correct_result integer not null default 1 check (points_correct_result >= 0),
  points_correct_difference integer not null default 2 check (points_correct_difference >= 0),
  points_exact_score integer not null default 3 check (points_exact_score >= 0),
  pre_tournament_bonus_champion integer not null default 0 check (pre_tournament_bonus_champion >= 0),
  pre_tournament_bonus_runner_up integer not null default 0 check (pre_tournament_bonus_runner_up >= 0),
  pre_tournament_bonus_third_place integer not null default 0 check (pre_tournament_bonus_third_place >= 0),
  pre_tournament_bonus_top_scorer integer not null default 0 check (pre_tournament_bonus_top_scorer >= 0),
  pre_tournament_bonus_best_player integer not null default 0 check (pre_tournament_bonus_best_player >= 0),
  pre_tournament_bonus_best_goalkeeper integer not null default 0 check (pre_tournament_bonus_best_goalkeeper >= 0),
  tiebreaker_rule public.tiebreaker_rule not null default 'most_exact_scores',
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  phase public.match_phase not null,
  home_team text not null,
  away_team text not null,
  match_time timestamptz not null,
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  status public.match_status not null default 'scheduled',
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home integer not null check (predicted_home >= 0),
  predicted_away integer not null check (predicted_away >= 0),
  predicted_winner text check (predicted_winner in ('home', 'away', 'draw')),
  points_earned integer not null default 0 check (points_earned >= 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_id, match_id)
);

create table if not exists public.pre_tournament_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  champion text,
  runner_up text,
  third_place text,
  top_scorer text,
  best_player text,
  best_goalkeeper text,
  locked boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (user_id, group_id)
);

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_points integer not null default 0 check (total_points >= 0),
  predictions_made integer not null default 0 check (predictions_made >= 0),
  exact_scores integer not null default 0 check (exact_scores >= 0),
  correct_results integer not null default 0 check (correct_results >= 0),
  rank integer check (rank is null or rank > 0),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_groups_admin_id on public.groups(admin_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_matches_match_time on public.matches(match_time);
create index if not exists idx_matches_phase_status on public.matches(phase, status);
create index if not exists idx_predictions_user_id on public.predictions(user_id);
create index if not exists idx_predictions_group_id on public.predictions(group_id);
create index if not exists idx_predictions_match_id on public.predictions(match_id);
create index if not exists idx_pre_tournament_picks_user_group on public.pre_tournament_picks(user_id, group_id);
create index if not exists idx_leaderboard_group_rank on public.leaderboard(group_id, rank);
create index if not exists idx_leaderboard_user_id on public.leaderboard(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_match_locked_at()
returns trigger
language plpgsql
as $$
begin
  new.locked_at = new.match_time - interval '24 hours';
  return new;
end;
$$;

drop trigger if exists trg_predictions_set_updated_at on public.predictions;
create trigger trg_predictions_set_updated_at
before update on public.predictions
for each row
execute procedure public.set_updated_at();

drop trigger if exists trg_leaderboard_set_updated_at on public.leaderboard;
create trigger trg_leaderboard_set_updated_at
before update on public.leaderboard
for each row
execute procedure public.set_updated_at();

drop trigger if exists trg_matches_set_locked_at on public.matches;
create trigger trg_matches_set_locked_at
before insert or update on public.matches
for each row
execute procedure public.set_match_locked_at();

create or replace function public.is_group_admin(_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = _group_id
      and g.admin_id = auth.uid()
  );
$$;

revoke all on function public.is_group_admin(uuid) from public;
grant execute on function public.is_group_admin(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.pre_tournament_picks enable row level security;
alter table public.leaderboard enable row level security;

drop policy if exists groups_select_admin on public.groups;
create policy groups_select_admin
on public.groups
for select
to authenticated
using (admin_id = auth.uid());

drop policy if exists groups_select_authenticated_for_join on public.groups;
create policy groups_select_authenticated_for_join
on public.groups
for select
to authenticated
using (true);

drop policy if exists groups_insert_self_admin on public.groups;
create policy groups_insert_self_admin
on public.groups
for insert
to authenticated
with check (admin_id = auth.uid());

drop policy if exists groups_update_admin on public.groups;
create policy groups_update_admin
on public.groups
for update
to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

drop policy if exists group_members_select_own_or_admin on public.group_members;
create policy group_members_select_own_or_admin
on public.group_members
for select
to authenticated
using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists group_members_insert_own_or_admin on public.group_members;
create policy group_members_insert_own_or_admin
on public.group_members
for insert
to authenticated
with check (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists group_members_update_own_or_admin on public.group_members;
create policy group_members_update_own_or_admin
on public.group_members
for update
to authenticated
using (user_id = auth.uid() or public.is_group_admin(group_id))
with check (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists group_members_delete_own_or_admin on public.group_members;
create policy group_members_delete_own_or_admin
on public.group_members
for delete
to authenticated
using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists matches_select_authenticated on public.matches;
create policy matches_select_authenticated
on public.matches
for select
to authenticated
using (true);

drop policy if exists predictions_select_own_or_admin on public.predictions;
create policy predictions_select_own_or_admin
on public.predictions
for select
to authenticated
using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists predictions_insert_own on public.predictions;
create policy predictions_insert_own
on public.predictions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists predictions_update_own on public.predictions;
create policy predictions_update_own
on public.predictions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists predictions_delete_own on public.predictions;
create policy predictions_delete_own
on public.predictions
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists pre_tournament_picks_select_own_or_admin on public.pre_tournament_picks;
create policy pre_tournament_picks_select_own_or_admin
on public.pre_tournament_picks
for select
to authenticated
using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists pre_tournament_picks_insert_own on public.pre_tournament_picks;
create policy pre_tournament_picks_insert_own
on public.pre_tournament_picks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists pre_tournament_picks_update_own on public.pre_tournament_picks;
create policy pre_tournament_picks_update_own
on public.pre_tournament_picks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists pre_tournament_picks_delete_own on public.pre_tournament_picks;
create policy pre_tournament_picks_delete_own
on public.pre_tournament_picks
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists leaderboard_select_own_or_admin on public.leaderboard;
create policy leaderboard_select_own_or_admin
on public.leaderboard
for select
to authenticated
using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists leaderboard_insert_own on public.leaderboard;
create policy leaderboard_insert_own
on public.leaderboard
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists leaderboard_update_own on public.leaderboard;
create policy leaderboard_update_own
on public.leaderboard
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists leaderboard_delete_own on public.leaderboard;
create policy leaderboard_delete_own
on public.leaderboard
for delete
to authenticated
using (user_id = auth.uid());
