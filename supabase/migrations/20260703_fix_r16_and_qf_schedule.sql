-- Fix Round of 16 (quarter_final phase) teams and dates
-- The quarter_final phase holds FIFA's Round of 16 (8 matches, Jul 4-7).
-- Previous data had wrong dates (Jul 9-12) and wrong team matchups.

UPDATE matches SET
  home_team  = 'Canada',
  away_team  = 'Morocco',
  match_time = '2026-07-04T17:00:00Z',
  locked_at  = '2026-07-04T16:30:00Z'
WHERE id = '7972bda2-3093-4a48-83bc-c9f8393bccd6';

UPDATE matches SET
  home_team  = 'Paraguay',
  away_team  = 'France',
  match_time = '2026-07-04T21:00:00Z',
  locked_at  = '2026-07-04T20:30:00Z'
WHERE id = '43c1a141-e14e-44ca-83cb-203c3389e43e';

UPDATE matches SET
  home_team  = 'Brazil',
  away_team  = 'Norway',
  match_time = '2026-07-05T20:00:00Z',
  locked_at  = '2026-07-05T19:30:00Z'
WHERE id = '6ed5c912-69a7-4c25-9bf7-a3e0f1c8f89e';

UPDATE matches SET
  match_time = '2026-07-06T00:00:00Z',
  locked_at  = '2026-07-05T23:30:00Z'
WHERE id = '204b8e60-1e52-448e-b9bc-cb07d965c70c'; -- Mexico vs England, teams already correct

UPDATE matches SET
  home_team  = 'Portugal',
  away_team  = 'Spain',
  match_time = '2026-07-06T19:00:00Z',
  locked_at  = '2026-07-06T18:30:00Z'
WHERE id = '4520ed22-d6eb-4542-8165-59387aceaf5c';

UPDATE matches SET
  home_team  = 'United States',
  away_team  = 'Belgium',
  match_time = '2026-07-07T00:00:00Z',
  locked_at  = '2026-07-06T23:30:00Z'
WHERE id = 'd8a65785-cff7-4dfc-82a4-f841da9c59f6';

-- Egypt confirmed winner of Australia vs Egypt (Round of 32). Home TBD pending Argentina vs Cape Verde result.
UPDATE matches SET
  home_team  = 'TBD',
  away_team  = 'Egypt',
  match_time = '2026-07-07T16:00:00Z',
  locked_at  = '2026-07-07T15:30:00Z'
WHERE id = '1e7c8b30-873d-425e-94c5-affeef99bf3d';

-- Switzerland confirmed winner of Switzerland vs Algeria. Away TBD pending Colombia vs Ghana result.
UPDATE matches SET
  match_time = '2026-07-07T20:00:00Z',
  locked_at  = '2026-07-07T19:30:00Z'
WHERE id = '5dffbe98-aa6e-4089-82cb-27a578028b8d'; -- Switzerland vs TBD, home team already correct

-- Fix Quarter-final (semi_final phase) dates
-- The semi_final phase holds FIFA's Quarter-finals (4 matches, Jul 9-12).
-- Previous data had wrong dates (Jul 14-17).

UPDATE matches SET match_time = '2026-07-09T20:00:00Z', locked_at = '2026-07-09T19:30:00Z'
WHERE id = 'd3acebc7-ed4a-42cb-bc88-4aa2b11ca289';

UPDATE matches SET match_time = '2026-07-10T19:00:00Z', locked_at = '2026-07-10T18:30:00Z'
WHERE id = 'dda49245-ff9d-49b5-8e96-0ec87114bc13';

UPDATE matches SET match_time = '2026-07-11T21:00:00Z', locked_at = '2026-07-11T20:30:00Z'
WHERE id = 'ee50b4c9-d154-4e70-9581-45f361caac88';

UPDATE matches SET match_time = '2026-07-12T00:00:00Z', locked_at = '2026-07-11T23:30:00Z'
WHERE id = 'd6bc784a-48cf-435a-b600-dd6cb01ed666';
