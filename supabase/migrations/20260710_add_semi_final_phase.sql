-- Add the missing Semi-finals phase (actual FIFA semi-finals, Jul 14-15).
-- The app had no phase between the Quarter-finals (semi_final phase) and the Final.
-- New phase name: "semi" — already in MatchPhase type and i18n keys.
--
-- NSF-1 (Jul 14): France vs Spain — W-SF-1 (France) vs W-SF-3 (Spain)
-- NSF-2 (Jul 15): TBD vs TBD    — W-SF-2 (Norway/England) vs W-SF-4 (Arg/Swi)
--
-- The Final is re-seeded from NSF winners instead of QF winners directly.

INSERT INTO matches (phase, home_team, away_team, match_time, locked_at, status, knockout_label, home_source, away_source)
VALUES
  ('semi', 'France', 'Spain',  '2026-07-14T19:00:00Z', '2026-07-14T18:30:00Z', 'scheduled', 'NSF-1', 'W-SF-1', 'W-SF-3'),
  ('semi', 'TBD',    'TBD',    '2026-07-15T19:00:00Z', '2026-07-15T18:30:00Z', 'scheduled', 'NSF-2', 'W-SF-2', 'W-SF-4');

-- Re-seed the Final from semi-final winners (instead of QF winners)
UPDATE matches SET home_team = 'TBD', away_team = 'TBD', home_source = 'W-NSF-1', away_source = 'W-NSF-2'
WHERE id = 'a52c0467-7822-416a-b0fa-d1654391e496';
