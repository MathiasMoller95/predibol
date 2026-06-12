import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BASE_URL = "https://v3.football.api-sports.io";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

type MatchStatus = "scheduled" | "live" | "finished";

type MatchRow = {
  id: string;
  phase: string;
  status: MatchStatus;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_time: string;
  manual_override: boolean;
  needs_scoring: boolean;
  source: "manual" | "api";
  api_fixture_id: number | null;
  advancing_team: string | null;
};

type ApiFixtureRow = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
};

type ApiSportsResponse<T> = {
  response: T[];
  errors?: unknown;
};

function apiStatusToMatchStatus(short: string): MatchStatus | null {
  // API-Football status docs: NS, 1H, HT, 2H, ET, P, FT, AET, PEN, ...
  if (short === "NS") return "scheduled";
  if (short === "FT" || short === "AET" || short === "PEN") return "finished";
  if (["1H", "HT", "2H", "ET", "P"].includes(short)) return "live";
  // Unknown statuses: skip for safety (do not update)
  return null;
}

function computeMatchMinute(short: string, elapsed: number | null): string | null {
  if (short === "FT") return "FT";
  if (short === "AET") return "105+";
  if (short === "PEN") return "PEN";
  if (short === "HT") return "HT";
  if (elapsed == null) return null;
  if (!Number.isFinite(elapsed)) return null;
  return String(Math.max(0, Math.floor(elapsed)));
}

function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfUtcDayIso(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function endOfUtcDayIso(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

async function apiGetFixtures(
  apiKey: string,
  mode: { type: "today"; dateKey: string } | { type: "next"; n: number },
): Promise<{ fixtures: ApiFixtureRow[]; ratelimitRemaining: number | null }> {
  const url =
    mode.type === "today"
      ? `${BASE_URL}/fixtures?league=1&season=2026&from=${mode.dateKey}&to=${mode.dateKey}`
      : `${BASE_URL}/fixtures?league=1&season=2026&next=${mode.n}`;

  const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  const remainingHeader = res.headers.get("x-ratelimit-remaining");
  const remaining = remainingHeader != null ? Number(remainingHeader) : null;

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API-Football error ${res.status}: ${t.slice(0, 500)}`);
  }

  const json = (await res.json()) as ApiSportsResponse<ApiFixtureRow>;
  return { fixtures: json.response ?? [], ratelimitRemaining: Number.isFinite(remaining) ? remaining : null };
}

async function invokeScoreMatch(
  supabaseUrl: string,
  serviceKey: string,
  matchId: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${supabaseUrl}/functions/v1/score-match`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ match_id: matchId }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  console.log("sync-matches invoked", new Date().toISOString());

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const apiKey = Deno.env.get("API_FOOTBALL_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !apiKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const todayKey = utcDateKey(now);

  // Load sync state for throttling
  const { data: stateRow } = await supabase
    .from("api_football_sync_state")
    .select("id,last_sync_at,last_ok_at,last_error,api_calls_remaining,next_planned_poll_seconds")
    .eq("id", 1)
    .maybeSingle();

  const lastSyncAt = (stateRow?.last_sync_at as string | null) ?? null;
  const lastSyncMs = lastSyncAt ? new Date(lastSyncAt).getTime() : null;

  // Retry scoring for matches that need re-scoring (e.g. late double_down) before any early skip
  {
    const { data: retryMatches } = await supabase
      .from("matches")
      .select("id,home_score,away_score,status,needs_scoring")
      .eq("needs_scoring", true)
      .eq("status", "finished")
      .not("home_score", "is", null)
      .not("away_score", "is", null)
      .limit(25);

    for (const row of (retryMatches ?? []) as Array<{ id: string }>) {
      const r = await invokeScoreMatch(supabaseUrl, serviceKey, row.id);
      if (r.ok) {
        await supabase.from("matches").update({ needs_scoring: false }).eq("id", row.id);
      } else {
        console.error("score-match retry failed", row.id, r.status, r.body.slice(0, 300));
      }
    }
  }

  const { count: liveCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "live");
  const hasLiveMatches = (liveCount ?? 0) > 0;

  const startIso = startOfUtcDayIso(now);
  const endIso = endOfUtcDayIso(now);
  const { count: todayCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .gte("match_time", startIso)
    .lte("match_time", endIso);
  const hasMatchesToday = (todayCount ?? 0) > 0;

  const { count: needsScoringCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("needs_scoring", true)
    .eq("status", "finished");

  // Smart skip: if nothing live, nothing today, no pending re-scores, and we synced recently, skip heavy API calls.
  if (!hasLiveMatches && !hasMatchesToday && (needsScoringCount ?? 0) === 0 && lastSyncMs != null) {
    const since = now.getTime() - lastSyncMs;
    const fifteenMin = 15 * 60 * 1000;
    if (since < fifteenMin) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No matches today/live; synced recently" }),
        { status: 200, headers: jsonHeaders },
      );
    }
  }

  const mode = hasLiveMatches || hasMatchesToday ? ({ type: "today", dateKey: todayKey } as const) : ({ type: "next", n: 10 } as const);

  let fixtures: ApiFixtureRow[] = [];
  let ratelimitRemaining: number | null = null;
  try {
    const out = await apiGetFixtures(apiKey, mode);
    fixtures = out.fixtures;
    ratelimitRemaining = out.ratelimitRemaining;
  } catch (e) {
    const msg = (e as Error).message;
    console.error("sync-matches: api fetch failed", msg);
    await supabase
      .from("api_football_sync_state")
      .update({ last_sync_at: now.toISOString(), last_error: msg, api_calls_remaining: ratelimitRemaining })
      .eq("id", 1);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 502, headers: jsonHeaders });
  }

  // Update sync state early
  await supabase
    .from("api_football_sync_state")
    .update({
      last_sync_at: now.toISOString(),
      api_calls_remaining: ratelimitRemaining,
      next_planned_poll_seconds: ratelimitRemaining != null && ratelimitRemaining < 50 ? 15 * 60 : 60,
      updated_at: now.toISOString(),
    })
    .eq("id", 1);

  if (fixtures.length === 0) {
    await supabase.from("api_football_sync_state").update({ last_ok_at: now.toISOString(), last_error: null }).eq("id", 1);
    return new Response(JSON.stringify({ ok: true, fixtures: 0, updated: 0 }), { status: 200, headers: jsonHeaders });
  }

  const fixtureIds = fixtures.map((f) => f.fixture.id);
  const { data: mappingRows, error: mapErr } = await supabase
    .from("api_football_fixtures")
    .select("api_fixture_id,match_id")
    .in("api_fixture_id", fixtureIds);
  if (mapErr) {
    const msg = `Mapping read failed: ${mapErr.message}`;
    await supabase.from("api_football_sync_state").update({ last_error: msg }).eq("id", 1);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: jsonHeaders });
  }

  const matchIdByFixtureId = new Map<number, string>();
  for (const r of mappingRows ?? []) {
    matchIdByFixtureId.set(r.api_fixture_id as number, r.match_id as string);
  }

  const matchIds = [...new Set([...matchIdByFixtureId.values()])];
  const { data: matchRows, error: matchErr } = await supabase
    .from("matches")
    .select(
      "id,phase,status,home_team,away_team,home_score,away_score,match_time,manual_override,needs_scoring,source,api_fixture_id,advancing_team",
    )
    .in("id", matchIds);
  if (matchErr) {
    const msg = `Matches read failed: ${matchErr.message}`;
    await supabase.from("api_football_sync_state").update({ last_error: msg }).eq("id", 1);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: jsonHeaders });
  }

  const matchById = new Map<string, MatchRow>();
  for (const m of (matchRows ?? []) as MatchRow[]) matchById.set(m.id, m);

  let updatedCount = 0;
  let finishedTransitions = 0;
  const warnings: string[] = [];

  for (const f of fixtures) {
    const fixtureId = f.fixture.id;
    const matchId = matchIdByFixtureId.get(fixtureId);
    if (!matchId) {
      warnings.push(`Unmapped fixture ${fixtureId}`);
      continue;
    }

    const m = matchById.get(matchId);
    if (!m) {
      warnings.push(`Missing match row ${matchId} for fixture ${fixtureId}`);
      continue;
    }

    if (m.manual_override === true) {
      continue;
    }

    const apiShort = (f.fixture.status.short ?? "").trim();
    const nextStatus = apiStatusToMatchStatus(apiShort);
    if (!nextStatus) continue;

    const nextHome = f.goals.home;
    const nextAway = f.goals.away;
    const nextMinute = computeMatchMinute(apiShort, f.fixture.status.elapsed ?? null);

    const patch: Record<string, unknown> = {};
    let changed = false;

    if (m.api_fixture_id == null || m.api_fixture_id !== fixtureId) {
      patch.api_fixture_id = fixtureId;
      changed = true;
    }

    if (m.source !== "api") {
      patch.source = "api";
      changed = true;
    }

    if (m.status !== nextStatus) {
      patch.status = nextStatus;
      changed = true;
    }

    if (nextHome != null && m.home_score !== nextHome) {
      patch.home_score = nextHome;
      changed = true;
    }

    if (nextAway != null && m.away_score !== nextAway) {
      patch.away_score = nextAway;
      changed = true;
    }

    if (nextMinute != null) {
      patch.match_minute = nextMinute;
      changed = true;
    }

    // Knockout winner auto-set (if not draw and match finished)
    if (nextStatus === "finished" && nextHome != null && nextAway != null && nextHome !== nextAway) {
      const winner = nextHome > nextAway ? m.home_team : m.away_team;
      if ((m.advancing_team ?? null) !== winner) {
        patch.advancing_team = winner;
        changed = true;
      }
    }

    if (!changed) continue;

    const prevStatus = m.status;
    const { error: upErr } = await supabase.from("matches").update(patch).eq("id", m.id);
    if (upErr) {
      warnings.push(`Update failed for match ${m.id}: ${upErr.message}`);
      continue;
    }
    updatedCount += 1;

    // Track per-fixture sync time
    await supabase
      .from("api_football_fixtures")
      .update({ last_synced_at: now.toISOString() })
      .eq("api_fixture_id", fixtureId);

    const shouldScore =
      nextStatus === "finished" &&
      nextHome != null &&
      nextAway != null &&
      (prevStatus !== "finished" || m.needs_scoring);

    if (shouldScore) {
      if (prevStatus !== "finished") finishedTransitions += 1;
      const r = await invokeScoreMatch(supabaseUrl, serviceKey, m.id);
      if (r.ok) {
        await supabase.from("matches").update({ needs_scoring: false }).eq("id", m.id);
      } else {
        console.error("score-match failed", m.id, r.status, r.body.slice(0, 300));
        await supabase.from("matches").update({ needs_scoring: true }).eq("id", m.id);
        await supabase
          .from("api_football_sync_state")
          .update({ last_error: `score-match failed for ${m.id}: ${r.status}` })
          .eq("id", 1);
      }
    }
  }

  await supabase.from("api_football_sync_state").update({ last_ok_at: now.toISOString() }).eq("id", 1);

  return new Response(
    JSON.stringify({
      ok: true,
      fixtures: fixtures.length,
      updated: updatedCount,
      finished_transitions: finishedTransitions,
      warnings,
      ratelimit_remaining: ratelimitRemaining,
      mode: mode.type,
    }),
    { status: 200, headers: jsonHeaders },
  );
});

