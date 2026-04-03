import { getFlag } from "@/lib/team-metadata";

export type MatchWithOdds = {
  home_team: string;
  away_team: string;
  home_win_odds: number | null;
  draw_odds: number | null;
  away_win_odds: number | null;
};

/** Minimum decimal win odds per team from group-stage matches (home/away role). */
export function minWinOddsByTeam(matches: MatchWithOdds[], teams: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const team of teams) {
    let min = Infinity;
    for (const m of matches) {
      if (m.home_team === team && m.home_win_odds != null) {
        min = Math.min(min, Number(m.home_win_odds));
      }
      if (m.away_team === team && m.away_win_odds != null) {
        min = Math.min(min, Number(m.away_win_odds));
      }
    }
    if (min !== Infinity) map.set(team, min);
  }
  return map;
}

/** Compact line: flag + odds for each team with data, sorted by lowest odds first. */
export function formatGroupOddsCompactLine(teams: string[], matches: MatchWithOdds[]): string | null {
  const byTeam = minWinOddsByTeam(matches, teams);
  if (byTeam.size === 0) return null;
  const rows = teams
    .filter((t) => byTeam.has(t))
    .map((t) => ({ team: t, odds: byTeam.get(t)! }))
    .sort((a, b) => a.odds - b.odds);
  return rows.map(({ team, odds }) => `${getFlag(team)} ${odds.toFixed(2)}x`).join(" | ");
}
