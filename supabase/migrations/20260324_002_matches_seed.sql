-- Seed FIFA World Cup 2026 group stage matches (72 fixtures).
-- Times converted from published ET schedule to UTC.

insert into public.matches (
  phase,
  home_team,
  away_team,
  match_time,
  status,
  home_score,
  away_score
)
select
  seeded.phase,
  seeded.home_team,
  seeded.away_team,
  seeded.match_time,
  seeded.status,
  seeded.home_score,
  seeded.away_score
from (
  values
    ('group'::public.match_phase, 'Mexico', 'South Africa', '2026-06-11T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'South Korea', 'UEFA Playoff D Winner', '2026-06-12T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff D Winner', 'South Africa', '2026-06-18T16:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Mexico', 'South Korea', '2026-06-19T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff D Winner', 'Mexico', '2026-06-25T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'South Africa', 'South Korea', '2026-06-25T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Canada', 'UEFA Playoff A Winner', '2026-06-12T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Qatar', 'Switzerland', '2026-06-13T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff A Winner', 'Switzerland', '2026-06-18T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Canada', 'Qatar', '2026-06-18T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Switzerland', 'Canada', '2026-06-24T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff A Winner', 'Qatar', '2026-06-24T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Brazil', 'Morocco', '2026-06-13T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Haiti', 'Scotland', '2026-06-14T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Scotland', 'Morocco', '2026-06-19T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Brazil', 'Haiti', '2026-06-20T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Scotland', 'Brazil', '2026-06-24T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Morocco', 'Haiti', '2026-06-24T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'United States', 'Paraguay', '2026-06-13T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Australia', 'UEFA Playoff C Winner', '2026-06-13T04:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'United States', 'Australia', '2026-06-19T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff C Winner', 'Paraguay', '2026-06-20T04:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff C Winner', 'United States', '2026-06-26T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Paraguay', 'Australia', '2026-06-26T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Germany', 'Curacao', '2026-06-14T17:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Ivory Coast', 'Ecuador', '2026-06-14T23:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Germany', 'Ivory Coast', '2026-06-20T20:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Ecuador', 'Curacao', '2026-06-21T00:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Ecuador', 'Germany', '2026-06-25T20:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Curacao', 'Ivory Coast', '2026-06-25T20:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Netherlands', 'Japan', '2026-06-14T20:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'UEFA Playoff B Winner', 'Tunisia', '2026-06-15T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Netherlands', 'UEFA Playoff B Winner', '2026-06-20T17:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Tunisia', 'Japan', '2026-06-21T04:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Tunisia', 'Netherlands', '2026-06-25T23:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Japan', 'UEFA Playoff B Winner', '2026-06-25T23:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Belgium', 'Egypt', '2026-06-15T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Iran', 'New Zealand', '2026-06-16T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Belgium', 'Iran', '2026-06-21T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'New Zealand', 'Egypt', '2026-06-22T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'New Zealand', 'Belgium', '2026-06-27T03:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Egypt', 'Iran', '2026-06-27T03:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Spain', 'Cape Verde', '2026-06-15T16:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Saudi Arabia', 'Uruguay', '2026-06-15T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Spain', 'Saudi Arabia', '2026-06-21T16:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Uruguay', 'Cape Verde', '2026-06-21T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Uruguay', 'Spain', '2026-06-27T00:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Cape Verde', 'Saudi Arabia', '2026-06-27T00:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'France', 'Senegal', '2026-06-16T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'FIFA Playoff 2 Winner', 'Norway', '2026-06-16T22:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'France', 'FIFA Playoff 2 Winner', '2026-06-22T21:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Norway', 'Senegal', '2026-06-23T00:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Norway', 'France', '2026-06-26T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Senegal', 'FIFA Playoff 2 Winner', '2026-06-26T19:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Argentina', 'Algeria', '2026-06-17T01:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Austria', 'Jordan', '2026-06-17T04:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Argentina', 'Austria', '2026-06-22T17:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Jordan', 'Algeria', '2026-06-23T03:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Jordan', 'Argentina', '2026-06-28T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Algeria', 'Austria', '2026-06-28T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'Portugal', 'FIFA Playoff 1 Winner', '2026-06-17T17:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Uzbekistan', 'Colombia', '2026-06-18T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Portugal', 'Uzbekistan', '2026-06-23T17:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Colombia', 'FIFA Playoff 1 Winner', '2026-06-24T02:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Colombia', 'Portugal', '2026-06-27T23:30:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'FIFA Playoff 1 Winner', 'Uzbekistan', '2026-06-27T23:30:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),

    ('group'::public.match_phase, 'England', 'Croatia', '2026-06-17T20:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Ghana', 'Panama', '2026-06-17T23:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'England', 'Ghana', '2026-06-23T20:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Panama', 'Croatia', '2026-06-23T23:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Panama', 'England', '2026-06-27T21:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer),
    ('group'::public.match_phase, 'Croatia', 'Ghana', '2026-06-27T21:00:00Z'::timestamptz, 'scheduled'::public.match_status, null::integer, null::integer)
) as seeded(phase, home_team, away_team, match_time, status, home_score, away_score)
where not exists (
  select 1
  from public.matches existing
  where existing.phase = seeded.phase
    and existing.home_team = seeded.home_team
    and existing.away_team = seeded.away_team
    and existing.match_time = seeded.match_time
);
