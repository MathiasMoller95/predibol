-- Add onboarding completion tracking (one-time tutorial on first Group Hub visit)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Backfill: existing users who already have predictions should not see onboarding.
UPDATE public.profiles p
SET onboarding_completed_at = p.created_at
WHERE p.onboarding_completed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.predictions pr WHERE pr.user_id = p.id);

