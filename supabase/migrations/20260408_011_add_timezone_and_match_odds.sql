-- RUN THIS IN SUPABASE SQL EDITOR
-- Numbered 011; project also has 20260407_010_update_playoff_teams.sql.

-- Add timezone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Madrid';

-- Add odds and AI prediction columns to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_win_odds DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS draw_odds DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_win_odds DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS ai_home_score INTEGER DEFAULT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS ai_away_score INTEGER DEFAULT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS odds_updated_at TIMESTAMPTZ DEFAULT NULL;
