-- Fix Round of 32 match_time and locked_at to real FIFA UTC kickoffs.
-- Derived from official FIFA/Wikipedia schedule: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_round_of_32
-- Also maps api_football_fixtures so sync-matches can update live scores.

-- ── 1. Correct match_time (locked_at auto-set to match_time - 30 min by trigger) ──────────────────

UPDATE public.matches SET match_time = '2026-06-28 19:00:00+00', locked_at = '2026-06-28 18:30:00+00' WHERE id = '4254e962-5d0f-4d8e-8a34-414952e54435'; -- R16-1  South Africa vs Canada
UPDATE public.matches SET match_time = '2026-06-29 17:00:00+00', locked_at = '2026-06-29 16:30:00+00' WHERE id = '02c45c97-67d9-4147-a33e-2b726633215c'; -- R16-2  Brazil vs Japan
UPDATE public.matches SET match_time = '2026-06-29 20:30:00+00', locked_at = '2026-06-29 20:00:00+00' WHERE id = '06db734a-07f1-4ebe-8f01-214410c765b6'; -- R16-3  Germany vs Paraguay
UPDATE public.matches SET match_time = '2026-06-30 01:00:00+00', locked_at = '2026-06-30 00:30:00+00' WHERE id = '8a63ee35-718d-467c-9d9c-53b69670127c'; -- R16-4  Netherlands vs Morocco
UPDATE public.matches SET match_time = '2026-06-30 17:00:00+00', locked_at = '2026-06-30 16:30:00+00' WHERE id = '7115e7ec-039c-4247-8ff0-3d2fe67e1896'; -- R16-5  Ivory Coast vs Norway
UPDATE public.matches SET match_time = '2026-06-30 21:00:00+00', locked_at = '2026-06-30 20:30:00+00' WHERE id = 'efe487e1-3f13-4c73-ac8d-6fd50bb1d5ee'; -- R16-6  France vs Sweden
UPDATE public.matches SET match_time = '2026-07-01 01:00:00+00', locked_at = '2026-07-01 00:30:00+00' WHERE id = '1ed63d2e-259d-4d57-a335-2df007a5b0cd'; -- R16-7  Mexico vs Ecuador
UPDATE public.matches SET match_time = '2026-07-01 16:00:00+00', locked_at = '2026-07-01 15:30:00+00' WHERE id = '65d03c78-0366-445b-b7d6-e9e0ac553167'; -- R16-8  England vs DR Congo
UPDATE public.matches SET match_time = '2026-07-01 20:00:00+00', locked_at = '2026-07-01 19:30:00+00' WHERE id = '57377a94-7f75-4f8d-8c35-7a7bb47f772b'; -- R16-9  Belgium vs Senegal
UPDATE public.matches SET match_time = '2026-07-02 00:00:00+00', locked_at = '2026-07-01 23:30:00+00' WHERE id = '7d617fe9-8b11-4d7d-9e36-0cffc0b058ae'; -- R16-10 USA vs Bosnia and Herzegovina
UPDATE public.matches SET match_time = '2026-07-02 19:00:00+00', locked_at = '2026-07-02 18:30:00+00' WHERE id = '17a15006-ae03-44e5-9d7b-29cc8aff1811'; -- R16-11 Spain vs Austria
UPDATE public.matches SET match_time = '2026-07-02 23:00:00+00', locked_at = '2026-07-02 22:30:00+00' WHERE id = '9824d6d7-2112-40eb-bd18-7a03625f182f'; -- R16-12 Portugal vs Croatia
UPDATE public.matches SET match_time = '2026-07-03 03:00:00+00', locked_at = '2026-07-03 02:30:00+00' WHERE id = '5cf3cb2b-0d81-457a-bd80-e19d8a066212'; -- R16-13 Switzerland vs Algeria
UPDATE public.matches SET match_time = '2026-07-03 18:00:00+00', locked_at = '2026-07-03 17:30:00+00' WHERE id = '2e32b263-c44e-4432-bf41-1356f1a42045'; -- R16-14 Australia vs Egypt
UPDATE public.matches SET match_time = '2026-07-03 22:00:00+00', locked_at = '2026-07-03 21:30:00+00' WHERE id = '2324becc-94e9-4de6-8c1f-3115a30d0157'; -- R16-15 Argentina vs Cape Verde
UPDATE public.matches SET match_time = '2026-07-04 01:30:00+00', locked_at = '2026-07-04 01:00:00+00' WHERE id = '39ab6273-6d44-4d63-af61-4918a4206862'; -- R16-16 Colombia vs Ghana

-- ── 2. Map API-Football fixture IDs so sync-matches can pick up live scores ─────────────────────────

INSERT INTO public.api_football_fixtures (api_fixture_id, match_id)
VALUES
  (1561329, '4254e962-5d0f-4d8e-8a34-414952e54435'), -- R16-1  South Africa vs Canada
  (1562344, '02c45c97-67d9-4147-a33e-2b726633215c'), -- R16-2  Brazil vs Japan
  (1565176, '06db734a-07f1-4ebe-8f01-214410c765b6'), -- R16-3  Germany vs Paraguay
  (1562345, '8a63ee35-718d-467c-9d9c-53b69670127c'), -- R16-4  Netherlands vs Morocco
  (1564789, '7115e7ec-039c-4247-8ff0-3d2fe67e1896'), -- R16-5  Ivory Coast vs Norway
  (1565177, 'efe487e1-3f13-4c73-ac8d-6fd50bb1d5ee'), -- R16-6  France vs Sweden
  (1567306, '1ed63d2e-259d-4d57-a335-2df007a5b0cd'), -- R16-7  Mexico vs Ecuador
  (1567307, '65d03c78-0366-445b-b7d6-e9e0ac553167'), -- R16-8  England vs DR Congo
  (1567308, '57377a94-7f75-4f8d-8c35-7a7bb47f772b'), -- R16-9  Belgium vs Senegal
  (1562586, '7d617fe9-8b11-4d7d-9e36-0cffc0b058ae'), -- R16-10 USA vs Bosnia and Herzegovina
  (1567311, '17a15006-ae03-44e5-9d7b-29cc8aff1811'), -- R16-11 Spain vs Austria
  (1567309, '9824d6d7-2112-40eb-bd18-7a03625f182f'), -- R16-12 Portugal vs Croatia
  (1567312, '5cf3cb2b-0d81-457a-bd80-e19d8a066212'), -- R16-13 Switzerland vs Algeria
  (1565178, '2e32b263-c44e-4432-bf41-1356f1a42045'), -- R16-14 Australia vs Egypt
  (1565179, '2324becc-94e9-4de6-8c1f-3115a30d0157'), -- R16-15 Argentina vs Cape Verde
  (1567310, '39ab6273-6d44-4d63-af61-4918a4206862')  -- R16-16 Colombia vs Ghana
ON CONFLICT (api_fixture_id) DO UPDATE SET match_id = EXCLUDED.match_id;
