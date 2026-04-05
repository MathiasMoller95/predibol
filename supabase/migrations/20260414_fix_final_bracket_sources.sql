-- Align Final slot sources with score-match propagation (W-{knockout_label}).
-- Previously W-SF-A / W-SF-B never matched semis (labels are SF-1 … SF-4).
-- Left-half / right-half simplification: finalist from SF-1 vs finalist from SF-3.
-- If your real draw differs, adjust manually; SF-2/SF-4 winners may still need resolve_knockout_match.
--
-- Third place still uses L-SF-A / L-SF-B; the edge function does not propagate losers—resolve teams in admin.

UPDATE public.matches
SET home_source = 'W-SF-1',
    away_source = 'W-SF-3'
WHERE knockout_label = 'F';
