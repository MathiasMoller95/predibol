-- Run in Supabase SQL Editor to verify odds/AI columns exist and values for upcoming matches.
-- 1) Columns must exist (migration 20260408_011_add_timezone_and_match_odds.sql).
-- 2) UI shows Market only when all three odds are non-null; AI when both ai_* scores are non-null.

select
  id,
  home_team,
  away_team,
  match_time,
  home_win_odds,
  draw_odds,
  away_win_odds,
  ai_home_score,
  ai_away_score
from public.matches
where match_time > now()
order by match_time
limit 20;
