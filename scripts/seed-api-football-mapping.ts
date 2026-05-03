import { config } from "dotenv";
import path from "node:path";

// Load .env.local explicitly (for local scripts run via tsx/node)
config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { teamFlags } from "../lib/team-metadata";
import fs from "node:fs";

type ApiSportsResponse<T> = {
  response: T[];
  errors?: unknown;
};

type ApiTeam = {
  team: { id: number; name: string };
};

type ApiFixture = {
  fixture: {
    id: number;
    date: string; // ISO
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
};

type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  match_time: string;
};

const BASE_URL = "https://v3.football.api-sports.io";

const TEAM_NAME_OVERRIDES: Record<string, string> = {
  "Czech Republic": "Czechia",
  "Congo DR": "DR Congo",
  "Cape Verde Islands": "Cape Verde",
};

function parseArgs(argv: string[]) {
  const set = new Set(argv.slice(2));
  return {
    dryRun: set.has("--dry-run"),
    verbose: set.has("--verbose"),
  };
}

function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const m = a.length;
  const n = b.length;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n]!;
}

function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  const d = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length, 1);
  return 1 - d / maxLen;
}

function bestTeamMatch(apiTeamName: string, predibolTeams: string[]): { team: string | null; score: number } {
  const alias: Record<string, string> = {
    "cote d ivoire": "Ivory Coast",
    "ivory coast": "Ivory Coast",
    "turkey": "Türkiye",
    "dr congo": "DR Congo",
    "united states of america": "United States",
    "usa": "United States",
    "south korea": "South Korea",
    "cape verde": "Cape Verde",
    "curacao": "Curaçao",
  };

  const n = normalizeName(apiTeamName);
  const direct = alias[n];
  if (direct && predibolTeams.includes(direct)) return { team: direct, score: 1 };

  let best: { team: string | null; score: number } = { team: null, score: -1 };
  for (const t of predibolTeams) {
    const s = similarity(apiTeamName, t);
    if (s > best.score) best = { team: t, score: s };
  }
  return best;
}

async function apiGet<T>(url: string, apiKey: string): Promise<{ data: T; ratelimitRemaining: number | null }> {
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API request failed ${res.status}: ${text.slice(0, 500)}`);
  }
  const remainingHeader = res.headers.get("x-ratelimit-remaining");
  const remaining = remainingHeader != null ? Number(remainingHeader) : null;
  const json = (await res.json()) as T;
  return { data: json, ratelimitRemaining: Number.isFinite(remaining) ? remaining : null };
}

function parseIso(d: string): number {
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) throw new Error(`Invalid date: ${d}`);
  return t;
}

function findBestFixtureMatch(
  fixtures: ApiFixture[],
  matches: MatchRow[],
  teamByApiId: Map<number, string>,
  verbose: boolean,
): { mapped: Array<{ api_fixture_id: number; match_id: string }>; unmatched: ApiFixture[] } {
  const mapped: Array<{ api_fixture_id: number; match_id: string }> = [];
  const unmatched: ApiFixture[] = [];

  const byPair = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const key = `${m.home_team}|||${m.away_team}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(m);
  }

  for (const f of fixtures) {
    const resolvedHome = teamByApiId.get(f.teams.home.id);
    const resolvedAway = teamByApiId.get(f.teams.away.id);
    if (!resolvedHome || !resolvedAway) {
      unmatched.push(f);
      if (verbose) {
        console.log(
          `Trying fixture: API[${f.teams.home.name} vs ${f.teams.away.name}] → Predibol[${resolvedHome ?? "?"} vs ${resolvedAway ?? "?"}] → match: not found`,
        );
      }
      continue;
    }

    const keyA = `${resolvedHome}|||${resolvedAway}`;
    const keyB = `${resolvedAway}|||${resolvedHome}`;
    const candidatesA = byPair.get(keyA) ?? [];
    const candidatesB = byPair.get(keyB) ?? [];
    const candidates = candidatesA.length > 0 ? candidatesA : candidatesB;

    if (candidates.length === 0) {
      unmatched.push(f);
      if (verbose) {
        console.log(
          `Trying fixture: API[${f.teams.home.name} vs ${f.teams.away.name}] → Predibol[${resolvedHome} vs ${resolvedAway}] → match: not found`,
        );
      }
      continue;
    }

    // Team pair should be unique in this tournament; if multiple exist, prefer closest time (debug only).
    let chosen = candidates[0]!;
    if (candidates.length > 1) {
      const ft = parseIso(f.fixture.date);
      let bestDelta = Number.POSITIVE_INFINITY;
      for (const c of candidates) {
        const ct = parseIso(c.match_time);
        const delta = Math.abs(ct - ft);
        if (delta < bestDelta) {
          bestDelta = delta;
          chosen = c;
        }
      }
    }

    mapped.push({ api_fixture_id: f.fixture.id, match_id: chosen.id });
    if (verbose) {
      console.log(
        `Trying fixture: API[${f.teams.home.name} vs ${f.teams.away.name}] → Predibol[${resolvedHome} vs ${resolvedAway}] → match: found (${chosen.id})`,
      );
    }
  }

  return { mapped, unmatched };
}

async function main() {
  const args = parseArgs(process.argv);

  const apiKey = (process.env.API_FOOTBALL_KEY ?? "").trim();
  if (!apiKey) throw new Error("Missing API_FOOTBALL_KEY (set in .env.local or environment).");

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service role key: ${serviceKey.substring(0, 20)}...`);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Sanity check: if this returns 0 rows and no error, you are likely using an anon key (RLS) instead of service role.
  const { data: testMatch, error: testError } = await supabase.from("matches").select("id,home_team,away_team").limit(1);
  console.log(`DB sanity check: ${testMatch?.length ?? 0} rows, error: ${testError?.message ?? "none"}`);
  if (testError) {
    process.exit(1);
  }

  const predibolTeams = Object.keys(teamFlags);

  console.log(`Fetching API teams (league=1 season=2026)…`);
  const teamsUrl = `${BASE_URL}/teams?league=1&season=2026`;
  const { data: teamsJson } = await apiGet<ApiSportsResponse<ApiTeam>>(teamsUrl, apiKey);
  const apiTeams = teamsJson.response ?? [];

  const teamByApiId = new Map<number, string>();
  const unmatchedTeams: Array<{ api_team_id: number; api_team_name: string; best: string | null; score: number }> = [];
  const teamRows: Array<{ api_team_id: number; team_name: string; api_team_name: string }> = [];

  for (const t of apiTeams) {
    const apiTeamId = t.team.id;
    const apiName = t.team.name;
    const override = TEAM_NAME_OVERRIDES[apiName];
    if (override && predibolTeams.includes(override)) {
      teamByApiId.set(apiTeamId, override);
      teamRows.push({ api_team_id: apiTeamId, team_name: override, api_team_name: apiName });
      continue;
    }
    const best = bestTeamMatch(apiName, predibolTeams);
    const ok = best.team && best.score >= 0.8;
    if (!ok) {
      unmatchedTeams.push({ api_team_id: apiTeamId, api_team_name: apiName, best: best.team, score: best.score });
      continue;
    }
    teamByApiId.set(apiTeamId, best.team!);
    teamRows.push({ api_team_id: apiTeamId, team_name: best.team!, api_team_name: apiName });
  }

  console.log(`Teams: matched ${teamRows.length}/${apiTeams.length}`);
  if (unmatchedTeams.length > 0) {
    console.log(`Unmatched teams (${unmatchedTeams.length}):`);
    for (const u of unmatchedTeams) {
      console.log(`- ${u.api_team_name} (id=${u.api_team_id}) best=${u.best ?? "—"} score=${u.score.toFixed(3)}`);
    }
  }

  console.log(`Fetching API fixtures (league=1 season=2026)…`);
  const fixturesUrl = `${BASE_URL}/fixtures?league=1&season=2026`;
  const { data: fixturesJson } = await apiGet<ApiSportsResponse<ApiFixture>>(fixturesUrl, apiKey);
  const fixtures = fixturesJson.response ?? [];
  console.log(`Fixtures received: ${fixtures.length}`);

  const { data: matchRows, error: matchErr } = await supabase
    .from("matches")
    .select("id,home_team,away_team,match_time")
    .order("match_time", { ascending: true });
  if (matchErr) throw new Error(`Failed to read matches: ${matchErr.message}`);
  const matches = (matchRows ?? []) as MatchRow[];

  const { mapped, unmatched } = findBestFixtureMatch(fixtures, matches, teamByApiId, args.verbose);
  console.log(`Fixtures: matched ${mapped.length}/${fixtures.length}`);

  if (unmatched.length > 0) {
    console.log(`Unmatched fixtures (${unmatched.length}):`);
    for (const f of unmatched.slice(0, 50)) {
      const home = teamByApiId.get(f.teams.home.id) ?? f.teams.home.name;
      const away = teamByApiId.get(f.teams.away.id) ?? f.teams.away.name;
      console.log(`- fixture=${f.fixture.id} ${home} vs ${away} @ ${f.fixture.date}`);
    }
    if (unmatched.length > 50) console.log(`(… ${unmatched.length - 50} more)`);
  }

  if (args.dryRun) {
    console.log(`\n--dry-run: no inserts performed.`);
    return;
  }

  console.log(`Inserting into api_football_teams…`);
  {
    const { error } = await supabase.from("api_football_teams").upsert(teamRows, { onConflict: "api_team_id" });
    if (error) throw new Error(`Failed to upsert api_football_teams: ${error.message}`);
  }

  console.log(`Inserting into api_football_fixtures…`);
  {
    const fixtureRows = mapped.map((m) => ({ api_fixture_id: m.api_fixture_id, match_id: m.match_id }));
    const { error } = await supabase.from("api_football_fixtures").upsert(fixtureRows, { onConflict: "api_fixture_id" });
    if (error) throw new Error(`Failed to upsert api_football_fixtures: ${error.message}`);
  }

  console.log(`Backfilling matches.api_fixture_id…`);
  // Update per row to avoid requiring RPC; 102 updates is fine for one-time setup.
  for (const m of mapped) {
    const { error } = await supabase
      .from("matches")
      .update({ api_fixture_id: m.api_fixture_id })
      .eq("id", m.match_id);
    if (error) throw new Error(`Failed updating match ${m.match_id}: ${error.message}`);
  }

  console.log(`Done.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

