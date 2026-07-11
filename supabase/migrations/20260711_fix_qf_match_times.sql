-- Fix quarter-final (semi_final phase) match times.
-- Belgium vs Spain and Norway vs England had completely swapped dates.
--
-- Correct schedule:
--   Match 97 (SF-1): Morocco vs France  - Jul 9  20:00 UTC - already correct
--   Match 98 (SF-3): Belgium vs Spain   - Jul 10 19:00 UTC (3pm ET at SoFi Stadium)
--   Match 99 (SF-2): Norway vs England  - Jul 11 21:00 UTC (5pm ET at Hard Rock Stadium)
--   Match 100 (SF-4): Switzerland vs Argentina - Jul 12 00:00 UTC (8pm ET Jul 11)

-- Norway vs England: was Jul 10 19:00 UTC -> correct to Jul 11 21:00 UTC
UPDATE matches SET
  match_time = '2026-07-11T21:00:00Z',
  locked_at  = '2026-07-11T20:30:00Z'
WHERE id = 'dda49245-ff9d-49b5-8e96-0ec87114bc13';

-- Belgium vs Spain: was Jul 11 21:00 UTC -> correct to Jul 10 19:00 UTC
UPDATE matches SET
  match_time = '2026-07-10T19:00:00Z',
  locked_at  = '2026-07-10T18:30:00Z'
WHERE id = 'ee50b4c9-d154-4e70-9581-45f361caac88';
