-- Weekly digest email opt-out (default on for existing users).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_weekly_recap boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.email_weekly_recap IS
  'When true, user may receive the weekly Predibol digest email (per-group recap).';
