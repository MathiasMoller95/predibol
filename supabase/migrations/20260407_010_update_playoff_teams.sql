-- RUN THIS IN SUPABASE SQL EDITOR
-- (File numbered 010 to avoid clashing with 20260406_009_add_profiles_table.sql.)

-- Before running UPDATEs, verify placeholder strings:
--   SELECT DISTINCT home_team FROM public.matches ORDER BY home_team;
--   SELECT DISTINCT away_team FROM public.matches ORDER BY away_team;
--
-- Seed (20260324_002_matches_seed.sql) uses:
--   UEFA Playoff A/B/C/D Winner, FIFA Playoff 1 Winner, FIFA Playoff 2 Winner, Curacao.

UPDATE public.matches SET home_team = 'Bosnia and Herzegovina' WHERE home_team = 'UEFA Playoff A Winner';
UPDATE public.matches SET away_team = 'Bosnia and Herzegovina' WHERE away_team = 'UEFA Playoff A Winner';

UPDATE public.matches SET home_team = 'Sweden' WHERE home_team = 'UEFA Playoff B Winner';
UPDATE public.matches SET away_team = 'Sweden' WHERE away_team = 'UEFA Playoff B Winner';

UPDATE public.matches SET home_team = 'Türkiye' WHERE home_team = 'UEFA Playoff C Winner';
UPDATE public.matches SET away_team = 'Türkiye' WHERE away_team = 'UEFA Playoff C Winner';

UPDATE public.matches SET home_team = 'Czechia' WHERE home_team = 'UEFA Playoff D Winner';
UPDATE public.matches SET away_team = 'Czechia' WHERE away_team = 'UEFA Playoff D Winner';

UPDATE public.matches SET home_team = 'DR Congo' WHERE home_team = 'FIFA Playoff 1 Winner';
UPDATE public.matches SET away_team = 'DR Congo' WHERE away_team = 'FIFA Playoff 1 Winner';

UPDATE public.matches SET home_team = 'Iraq' WHERE home_team = 'FIFA Playoff 2 Winner';
UPDATE public.matches SET away_team = 'Iraq' WHERE away_team = 'FIFA Playoff 2 Winner';

UPDATE public.matches SET home_team = 'Curaçao' WHERE home_team = 'Curacao';
UPDATE public.matches SET away_team = 'Curaçao' WHERE away_team = 'Curacao';
