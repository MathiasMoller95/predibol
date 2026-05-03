/** Matches `public.groups.access_mode` CHECK (generated `Database` types use `string`). */
export type GroupAccessMode = "open" | "protected";

/** Matches `public.matches.phase` / `Constants.public.Enums.match_phase`. */
export type MatchPhase =
  | "group"
  | "round_of_16"
  | "quarter"
  | "semi"
  | "final"
  | "quarter_final"
  | "semi_final"
  | "third_place";

/** Matches `public.matches.status` / `Constants.public.Enums.match_status`. */
export type MatchStatus = "scheduled" | "live" | "finished";
