-- Snapshot prior rank position for leaderboard movement indicators between scoring runs.

alter table public.leaderboard
  add column if not exists previous_rank integer;

comment on column public.leaderboard.previous_rank is 'Leaderboard rank from the scoring run immediately before this one (set by score-match).';

create or replace function public.snapshot_leaderboard_previous_rank(gid uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.leaderboard set previous_rank = rank where group_id = gid;
$$;

revoke all on function public.snapshot_leaderboard_previous_rank(uuid) from public;
grant execute on function public.snapshot_leaderboard_previous_rank(uuid) to service_role;
