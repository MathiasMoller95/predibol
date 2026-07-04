-- Fix quarter_final (FIFA Round of 16) bracket seeding.
-- The original home_source/away_source values were wrong for 3 matches,
-- causing winner propagation from score-match to put the wrong teams.
--
-- Correct bracket (winners carry forward via home_source/away_source):
--   Jul 4: Canada  (W-R16-1) vs Morocco  (W-R16-4)
--   Jul 4: Paraguay(W-R16-3) vs France   (W-R16-6)
--   Jul 5: Brazil  (W-R16-2) vs Norway   (W-R16-5)
--   Jul 6: Mexico  (W-R16-7) vs England  (W-R16-8)  -- was already correct
--   Jul 6: Spain   (W-R16-11)vs Portugal (W-R16-12) -- was already correct
--   Jul 7: Belgium (W-R16-9) vs US       (W-R16-10) -- was already correct
--   Jul 7: Argentina(W-R16-15)vs TBD     (W-R16-16) -- team names corrected
--   Jul 7: Switzerland(W-R16-13)vs Egypt (W-R16-14) -- was already correct

-- 7972bda2: Canada vs Morocco (was Canada vs Brazil, away_source was W-R16-2)
UPDATE matches SET away_team = 'Morocco', away_source = 'W-R16-4'
WHERE id = '7972bda2-3093-4a48-83bc-c9f8393bccd6';

-- 43c1a141: Paraguay vs France (was Paraguay vs Morocco, away_source was W-R16-4)
UPDATE matches SET away_team = 'France', away_source = 'W-R16-6'
WHERE id = '43c1a141-e14e-44ca-83cb-203c3389e43e';

-- 6ed5c912: Brazil vs Norway (was Norway vs France, sources were swapped)
UPDATE matches SET home_team = 'Brazil', away_team = 'Norway', home_source = 'W-R16-2', away_source = 'W-R16-5'
WHERE id = '6ed5c912-69a7-4c25-9bf7-a3e0f1c8f89e';

-- 1e7c8b30: Argentina vs TBD (was TBD vs Egypt; Argentina won R16-15, R16-16 still pending)
UPDATE matches SET home_team = 'Argentina', away_team = 'TBD'
WHERE id = '1e7c8b30-873d-425e-94c5-affeef99bf3d';
