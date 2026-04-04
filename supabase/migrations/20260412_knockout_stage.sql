-- New match_phase enum values must run alone and COMMIT before any INSERT/ALTER uses them.
-- Supabase CLI applies each migration file in its own transaction (run `supabase db push`).
-- In the SQL Editor: run this entire file, click Run; then run 20260413_knockout_stage_data.sql.

ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'quarter_final';
ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'semi_final';
ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'third_place';
