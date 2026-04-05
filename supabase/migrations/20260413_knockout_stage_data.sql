-- Knockout columns, seed matches, resolve_knockout_match.
-- Prerequisite: 20260412_knockout_stage.sql (enum values) must already be committed.

-- Placeholder bracket, dates, and sources — verify against FIFA before production.
-- Existing enum: group, round_of_16, quarter, semi, final (+ quarter_final, semi_final, third_place from prior migration)

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS knockout_label text,
  ADD COLUMN IF NOT EXISTS home_source text,
  ADD COLUMN IF NOT EXISTS away_source text,
  ADD COLUMN IF NOT EXISTS advancing_team text;

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS predicted_advancing text;

INSERT INTO public.matches (phase, home_team, away_team, match_time, locked_at, status, knockout_label, home_source, away_source)
VALUES
  ('round_of_16', 'TBD', 'TBD', '2026-06-28 16:00:00+00', '2026-06-27 16:00:00+00', 'scheduled', 'R16-1', '1A', '2B'),
  ('round_of_16', 'TBD', 'TBD', '2026-06-28 20:00:00+00', '2026-06-27 20:00:00+00', 'scheduled', 'R16-2', '1C', '2D'),
  ('round_of_16', 'TBD', 'TBD', '2026-06-29 16:00:00+00', '2026-06-28 16:00:00+00', 'scheduled', 'R16-3', '1E', '2F'),
  ('round_of_16', 'TBD', 'TBD', '2026-06-29 20:00:00+00', '2026-06-28 20:00:00+00', 'scheduled', 'R16-4', '1G', '2H'),
  ('round_of_16', 'TBD', 'TBD', '2026-06-30 16:00:00+00', '2026-06-29 16:00:00+00', 'scheduled', 'R16-5', '1B', '2A'),
  ('round_of_16', 'TBD', 'TBD', '2026-06-30 20:00:00+00', '2026-06-29 20:00:00+00', 'scheduled', 'R16-6', '1D', '2C'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-01 16:00:00+00', '2026-06-30 16:00:00+00', 'scheduled', 'R16-7', '1F', '2E'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-01 20:00:00+00', '2026-06-30 20:00:00+00', 'scheduled', 'R16-8', '1H', '2G'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-02 16:00:00+00', '2026-07-01 16:00:00+00', 'scheduled', 'R16-9', '1I', '2J'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-02 20:00:00+00', '2026-07-01 20:00:00+00', 'scheduled', 'R16-10', '1K', '2L'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-03 16:00:00+00', '2026-07-02 16:00:00+00', 'scheduled', 'R16-11', '1J', '2I'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-03 20:00:00+00', '2026-07-02 20:00:00+00', 'scheduled', 'R16-12', '1L', '2K'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-04 16:00:00+00', '2026-07-03 16:00:00+00', 'scheduled', 'R16-13', '1A', '3C/D/E'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-04 20:00:00+00', '2026-07-03 20:00:00+00', 'scheduled', 'R16-14', '1E', '3A/B/F'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-05 16:00:00+00', '2026-07-04 16:00:00+00', 'scheduled', 'R16-15', '1I', '3G/H/J'),
  ('round_of_16', 'TBD', 'TBD', '2026-07-05 20:00:00+00', '2026-07-04 20:00:00+00', 'scheduled', 'R16-16', '1K', '3I/J/L');

INSERT INTO public.matches (phase, home_team, away_team, match_time, locked_at, status, knockout_label, home_source, away_source)
VALUES
  ('quarter_final', 'TBD', 'TBD', '2026-07-09 18:00:00+00', '2026-07-08 18:00:00+00', 'scheduled', 'QF-1', 'W-R16-1', 'W-R16-2'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-09 22:00:00+00', '2026-07-08 22:00:00+00', 'scheduled', 'QF-2', 'W-R16-3', 'W-R16-4'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-10 18:00:00+00', '2026-07-09 18:00:00+00', 'scheduled', 'QF-3', 'W-R16-5', 'W-R16-6'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-10 22:00:00+00', '2026-07-09 22:00:00+00', 'scheduled', 'QF-4', 'W-R16-7', 'W-R16-8'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-11 18:00:00+00', '2026-07-10 18:00:00+00', 'scheduled', 'QF-5', 'W-R16-9', 'W-R16-10'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-11 22:00:00+00', '2026-07-10 22:00:00+00', 'scheduled', 'QF-6', 'W-R16-11', 'W-R16-12'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-12 18:00:00+00', '2026-07-11 18:00:00+00', 'scheduled', 'QF-7', 'W-R16-13', 'W-R16-14'),
  ('quarter_final', 'TBD', 'TBD', '2026-07-12 22:00:00+00', '2026-07-11 22:00:00+00', 'scheduled', 'QF-8', 'W-R16-15', 'W-R16-16');

INSERT INTO public.matches (phase, home_team, away_team, match_time, locked_at, status, knockout_label, home_source, away_source)
VALUES
  ('semi_final', 'TBD', 'TBD', '2026-07-14 20:00:00+00', '2026-07-13 20:00:00+00', 'scheduled', 'SF-1', 'W-QF-1', 'W-QF-2'),
  ('semi_final', 'TBD', 'TBD', '2026-07-15 20:00:00+00', '2026-07-14 20:00:00+00', 'scheduled', 'SF-2', 'W-QF-3', 'W-QF-4'),
  ('semi_final', 'TBD', 'TBD', '2026-07-16 20:00:00+00', '2026-07-15 20:00:00+00', 'scheduled', 'SF-3', 'W-QF-5', 'W-QF-6'),
  ('semi_final', 'TBD', 'TBD', '2026-07-17 20:00:00+00', '2026-07-16 20:00:00+00', 'scheduled', 'SF-4', 'W-QF-7', 'W-QF-8');

INSERT INTO public.matches (phase, home_team, away_team, match_time, locked_at, status, knockout_label, home_source, away_source)
VALUES
  ('third_place', 'TBD', 'TBD', '2026-07-18 20:00:00+00', '2026-07-17 20:00:00+00', 'scheduled', '3RD', 'L-SF-A', 'L-SF-B');

INSERT INTO public.matches (phase, home_team, away_team, match_time, locked_at, status, knockout_label, home_source, away_source)
VALUES
  ('final', 'TBD', 'TBD', '2026-07-19 20:00:00+00', '2026-07-18 20:00:00+00', 'scheduled', 'F', 'W-SF-1', 'W-SF-3');

CREATE OR REPLACE FUNCTION public.resolve_knockout_match(
  p_match_id uuid,
  p_home_team text,
  p_away_team text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.groups g WHERE g.admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.matches
  SET home_team = p_home_team,
      away_team = p_away_team
  WHERE id = p_match_id
    AND phase IN ('round_of_16', 'quarter', 'quarter_final', 'semi', 'semi_final', 'third_place', 'final');
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_knockout_match(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_knockout_match(uuid, text, text) TO authenticated;
