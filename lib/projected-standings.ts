import { getGroup } from "@/lib/team-metadata";

export type GroupMatchLite = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
};

export type PredictionScores = Record<string, { home: number; away: number } | undefined>;

export type TeamStandingRow = {
  team: string;
  pts: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
};

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

function emptyStats() {
  return { pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
}

function addResult(
  stats: Map<string, ReturnType<typeof emptyStats>>,
  home: string,
  away: string,
  hs: number,
  as: number,
) {
  const h = stats.get(home) ?? emptyStats();
  const a = stats.get(away) ?? emptyStats();
  h.gf += hs;
  h.ga += as;
  a.gf += as;
  a.ga += hs;
  if (hs > as) {
    h.pts += 3;
    h.w += 1;
    a.l += 1;
  } else if (hs < as) {
    a.pts += 3;
    a.w += 1;
    h.l += 1;
  } else {
    h.pts += 1;
    a.pts += 1;
    h.d += 1;
    a.d += 1;
  }
  stats.set(home, h);
  stats.set(away, a);
}

function toRows(stats: Map<string, ReturnType<typeof emptyStats>>): TeamStandingRow[] {
  return Array.from(stats.entries()).map(([team, s]) => ({
    team,
    pts: s.pts,
    w: s.w,
    d: s.d,
    l: s.l,
    gf: s.gf,
    ga: s.ga,
    gd: s.gf - s.ga,
  }));
}

/** Negative if a ranks above b, positive if b ranks above a */
function headToHeadCompare(
  a: string,
  b: string,
  letter: string,
  groupMatches: GroupMatchLite[],
  preds: PredictionScores,
): number {
  for (const m of groupMatches) {
    if (m.phase !== "group" || getGroup(m.home_team) !== letter) continue;
    const pr = preds[m.id];
    if (!pr) continue;
    const { home: hs, away: as } = pr;
    if (m.home_team === a && m.away_team === b) {
      if (hs > as) return -1;
      if (hs < as) return 1;
      return 0;
    }
    if (m.home_team === b && m.away_team === a) {
      if (as > hs) return -1;
      if (as < hs) return 1;
      return 0;
    }
  }
  return 0;
}

function compareTeamRows(
  a: TeamStandingRow,
  b: TeamStandingRow,
  letter: string,
  groupMatches: GroupMatchLite[],
  preds: PredictionScores,
): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  const h2h = headToHeadCompare(a.team, b.team, letter, groupMatches, preds);
  if (h2h !== 0) return h2h;
  return a.team.localeCompare(b.team);
}

/** Mini-league among tied teams (same pts, gd, gf) */
function tieBreakMiniLeague(
  tied: TeamStandingRow[],
  letter: string,
  groupMatches: GroupMatchLite[],
  preds: PredictionScores,
): TeamStandingRow[] {
  if (tied.length <= 1) return tied;
  const teams = new Set(tied.map((r) => r.team));
  const mini = new Map<string, ReturnType<typeof emptyStats>>();
  for (const t of Array.from(teams)) mini.set(t, emptyStats());

  for (const m of groupMatches) {
    if (m.phase !== "group" || getGroup(m.home_team) !== letter) continue;
    const h = m.home_team;
    const aw = m.away_team;
    if (!teams.has(h) || !teams.has(aw)) continue;
    const pr = preds[m.id];
    if (!pr) continue;
    addResult(mini, h, aw, pr.home, pr.away);
  }

  return [...tied].sort((x, y) => {
    const sx = mini.get(x.team)!;
    const sy = mini.get(y.team)!;
    if (sy.pts !== sx.pts) return sy.pts - sx.pts;
    const gdx = sx.gf - sx.ga;
    const gdy = sy.gf - sy.ga;
    if (gdy !== gdx) return gdy - gdx;
    if (sy.gf !== sx.gf) return sy.gf - sx.gf;
    return x.team.localeCompare(y.team);
  });
}

function sortGroupStandings(
  rows: TeamStandingRow[],
  letter: string,
  groupMatches: GroupMatchLite[],
  preds: PredictionScores,
): TeamStandingRow[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => compareTeamRows(a, b, letter, groupMatches, preds));

  let i = 0;
  const out: TeamStandingRow[] = [];
  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j]!.pts === sorted[i]!.pts &&
      sorted[j]!.gd === sorted[i]!.gd &&
      sorted[j]!.gf === sorted[i]!.gf
    ) {
      j++;
    }
    const bucket = sorted.slice(i, j);
    if (bucket.length >= 2) {
      out.push(...tieBreakMiniLeague(bucket, letter, groupMatches, preds));
    } else {
      out.push(bucket[0]!);
    }
    i = j;
  }
  return out;
}

export function computeGroupStandingsForLetter(
  letter: string,
  groupStageMatches: GroupMatchLite[],
  preds: PredictionScores,
): TeamStandingRow[] {
  const letterMatches = groupStageMatches.filter((m) => m.phase === "group" && getGroup(m.home_team) === letter);
  const stats = new Map<string, ReturnType<typeof emptyStats>>();
  for (const m of letterMatches) {
    const pr = preds[m.id];
    if (!pr) continue;
    if (!stats.has(m.home_team)) stats.set(m.home_team, emptyStats());
    if (!stats.has(m.away_team)) stats.set(m.away_team, emptyStats());
    addResult(stats, m.home_team, m.away_team, pr.home, pr.away);
  }
  const rows = toRows(stats);
  return sortGroupStandings(rows, letter, groupStageMatches, preds);
}

export function computeProjectedStandings(
  groupStageMatches: GroupMatchLite[],
  preds: PredictionScores,
): Map<string, TeamStandingRow[]> {
  const map = new Map<string, TeamStandingRow[]>();
  for (const letter of GROUP_LETTERS) {
    map.set(letter, computeGroupStandingsForLetter(letter, groupStageMatches, preds));
  }
  return map;
}

export type ThirdPlaceRow = {
  team: string;
  groupLetter: string;
  pts: number;
  gd: number;
  gf: number;
};

export function rankThirdPlaceTeams(standingsByLetter: Map<string, TeamStandingRow[]>): {
  ranked: ThirdPlaceRow[];
  rankByTeam: Map<string, number>;
  top8: Set<string>;
} {
  const thirds: ThirdPlaceRow[] = [];
  for (const letter of GROUP_LETTERS) {
    const rows = standingsByLetter.get(letter) ?? [];
    if (rows.length < 3) continue;
    const third = rows[2]!;
    thirds.push({
      team: third.team,
      groupLetter: letter,
      pts: third.pts,
      gd: third.gd,
      gf: third.gf,
    });
  }
  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
  const rankByTeam = new Map<string, number>();
  thirds.forEach((t, i) => rankByTeam.set(t.team, i));
  const top8 = new Set(thirds.slice(0, 8).map((t) => t.team));
  return { ranked: thirds, rankByTeam, top8 };
}

const PLACE_RE = /^([12])([A-L])$/;
const THIRD_POOL_RE = /^3((?:[A-L])(?:\/[A-L])*)$/;

function parseThirdPool(token: string): string[] | null {
  const m = token.match(THIRD_POOL_RE);
  if (!m) return null;
  return m[1]!.split("/");
}

export function resolveSourceToken(
  raw: string | null,
  standingsByLetter: Map<string, TeamStandingRow[]>,
  rankByTeam: Map<string, number>,
  top8: Set<string>,
): { team: string; uncertain: boolean } {
  if (!raw || raw === "TBD") return { team: "?", uncertain: true };

  const m1 = raw.match(PLACE_RE);
  if (m1) {
    const place = Number(m1[1]) - 1;
    const letter = m1[2]!;
    const rows = standingsByLetter.get(letter) ?? [];
    if (rows.length <= place) return { team: "?", uncertain: true };
    const row = rows[place];
    if (!row) return { team: "?", uncertain: true };
    return { team: row.team, uncertain: false };
  }

  const pools = parseThirdPool(raw);
  if (pools && pools.length > 0) {
    const candidates: { team: string; rank: number }[] = [];
    for (const letter of pools) {
      const rows = standingsByLetter.get(letter) ?? [];
      if (rows.length < 3) continue;
      const third = rows[2]!;
      const r = rankByTeam.get(third.team);
      if (r === undefined) continue;
      if (!top8.has(third.team)) continue;
      candidates.push({ team: third.team, rank: r });
    }
    if (candidates.length === 0) return { team: "?", uncertain: true };
    candidates.sort((a, b) => a.rank - b.rank);
    return { team: candidates[0]!.team, uncertain: false };
  }

  return { team: "?", uncertain: true };
}

export type R16MatchLite = {
  id: string;
  phase: string;
  knockout_label: string | null;
  home_source: string | null;
  away_source: string | null;
  home_team: string;
  away_team: string;
};

export type ProjectedR16Side = {
  team: string;
  uncertain: boolean;
};

export function computeProjectedR16(
  r16Matches: R16MatchLite[],
  standingsByLetter: Map<string, TeamStandingRow[]>,
  rankByTeam: Map<string, number>,
  top8: Set<string>,
): Map<string, { home: ProjectedR16Side; away: ProjectedR16Side }> {
  const out = new Map<string, { home: ProjectedR16Side; away: ProjectedR16Side }>();
  for (const m of r16Matches) {
    const label = m.knockout_label ?? m.id;
    const home = resolveSourceToken(m.home_source, standingsByLetter, rankByTeam, top8);
    const away = resolveSourceToken(m.away_source, standingsByLetter, rankByTeam, top8);
    out.set(label, { home, away });
  }
  return out;
}

export function buildPredictionScoresFromInputs(
  matches: GroupMatchLite[],
  inputs: Record<string, { predictedHome: string; predictedAway: string }>,
): PredictionScores {
  const preds: PredictionScores = {};
  for (const m of matches) {
    const inp = inputs[m.id];
    const h = inp?.predictedHome !== "" && inp?.predictedHome !== undefined ? Number(inp.predictedHome) : NaN;
    const a = inp?.predictedAway !== "" && inp?.predictedAway !== undefined ? Number(inp.predictedAway) : NaN;
    if (!Number.isFinite(h) || !Number.isFinite(a)) continue;
    preds[m.id] = { home: h, away: a };
  }
  return preds;
}
