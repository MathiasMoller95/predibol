-- Fix stale locked_at for all scheduled future matches
-- (missed by 20260610 backfill because their old 24h locked_at was already past)
UPDATE public.matches
SET locked_at = match_time - interval '30 minutes'
WHERE status = 'scheduled'
  AND match_time > now();
