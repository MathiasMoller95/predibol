import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type MatchPhase = "group" | "round_of_16" | "quarter" | "semi" | "final";
type MatchRow = {
  id: string;
  phase: MatchPhase;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type GroupRow = {
  id: string;
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
};

type PredictionRow = {
  id: string;
  user_id: string;
  group_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  points_earned: number;
};

function outcome(h: number, a: number): "home" | "away" | "draw" {
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}

function isKnockoutPhase(phase: MatchPhase): boolean {
  return phase !== "group";
}

function computePointsForPrediction(
  H: number,
  A: number,
  phase: MatchPhase,
  predHome: number,
  predAway: number,
  predictedWinner: "home" | "away" | "draw" | null,
  g: GroupRow
): number {
  const actualResult = outcome(H, A);
  const predResult = outcome(predHome, predAway);
  const correctResult = predResult === actualResult;
  const correctDiff = predHome - predAway === H - A;
  const exactScore = predHome === H && predAway === A;

  let pts = 0;
  if (correctResult) pts += g.points_correct_result;
  if (correctDiff) pts += g.points_correct_difference;
  if (exactScore) pts += g.points_exact_score;

  if (isKnockoutPhase(phase) && H !== A) {
    const actualWinner: "home" | "away" = H > A ? "home" : "away";
    if (
      !exactScore &&
      (predictedWinner === "home" || predictedWinner === "away") &&
      predictedWinner === actualWinner
    ) {
      pts += g.points_exact_score;
    }
  }

  return pts;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { match_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const matchId = body.match_id?.trim();
  if (!matchId) {
    return new Response(JSON.stringify({ error: "match_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id, phase, home_score, away_score, status")
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr || !match) {
    return new Response(JSON.stringify({ error: "Match not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const m = match as MatchRow;
  if (m.status !== "finished") {
    return new Response(
      JSON.stringify({ error: "Match must have status finished to score" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
  if (m.home_score === null || m.away_score === null) {
    return new Response(
      JSON.stringify({ error: "Match must have home_score and away_score" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  const H = m.home_score;
  const A = m.away_score;

  const { data: predictions, error: predErr } = await supabase
    .from("predictions")
    .select(
      "id, user_id, group_id, match_id, predicted_home, predicted_away, predicted_winner, points_earned"
    )
    .eq("match_id", matchId);

  if (predErr) {
    return new Response(JSON.stringify({ error: predErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const predList = (predictions ?? []) as PredictionRow[];
  const groupIds = [...new Set(predList.map((p) => p.group_id))];

  const groupMap = new Map<string, GroupRow>();
  if (groupIds.length > 0) {
    const { data: groups, error: gErr } = await supabase
      .from("groups")
      .select("id, points_correct_result, points_correct_difference, points_exact_score")
      .in("id", groupIds);
    if (gErr) {
      return new Response(JSON.stringify({ error: gErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    for (const row of groups ?? []) {
      groupMap.set((row as GroupRow).id, row as GroupRow);
    }
  }

  for (const p of predList) {
    const g = groupMap.get(p.group_id);
    if (!g) continue;
    const pts = computePointsForPrediction(
      H,
      A,
      m.phase,
      p.predicted_home,
      p.predicted_away,
      p.predicted_winner,
      g
    );
    const { error: upErr } = await supabase.from("predictions").update({ points_earned: pts }).eq("id", p.id);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  for (const gid of groupIds) {
    const { data: allPreds, error: apErr } = await supabase
      .from("predictions")
      .select(
        "user_id, predicted_home, predicted_away, points_earned, match_id"
      )
      .eq("group_id", gid);
    if (apErr) {
      return new Response(JSON.stringify({ error: apErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const matchIds = [...new Set((allPreds ?? []).map((row: { match_id: string }) => row.match_id))];
    const { data: matchesRows, error: mErr } = await supabase
      .from("matches")
      .select("id, home_score, away_score, status")
      .in("id", matchIds);
    if (mErr) {
      return new Response(JSON.stringify({ error: mErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const matchById = new Map<string, { home_score: number | null; away_score: number | null; status: string }>();
    for (const row of matchesRows ?? []) {
      matchById.set(row.id as string, {
        home_score: row.home_score as number | null,
        away_score: row.away_score as number | null,
        status: row.status as string,
      });
    }

    const byUser = new Map<
      string,
      { total_points: number; predictions_made: number; exact_scores: number; correct_results: number }
    >();

    for (const row of allPreds ?? []) {
      const uid = (row as { user_id: string }).user_id;
      const predHome = (row as { predicted_home: number }).predicted_home;
      const predAway = (row as { predicted_away: number }).predicted_away;
      const pts = (row as { points_earned: number }).points_earned;
      const mid = (row as { match_id: string }).match_id;

      if (!byUser.has(uid)) {
        byUser.set(uid, {
          total_points: 0,
          predictions_made: 0,
          exact_scores: 0,
          correct_results: 0,
        });
      }
      const agg = byUser.get(uid)!;
      agg.total_points += pts;
      agg.predictions_made += 1;

      const mr = matchById.get(mid);
      if (
        mr &&
        mr.status === "finished" &&
        mr.home_score !== null &&
        mr.away_score !== null
      ) {
        const h = mr.home_score;
        const a = mr.away_score;
        if (predHome === h && predAway === a) {
          agg.exact_scores += 1;
        }
        if (outcome(predHome, predAway) === outcome(h, a)) {
          agg.correct_results += 1;
        }
      }
    }

    const upsertRows = [...byUser.entries()].map(([user_id, agg]) => ({
      group_id: gid,
      user_id,
      total_points: agg.total_points,
      predictions_made: agg.predictions_made,
      exact_scores: agg.exact_scores,
      correct_results: agg.correct_results,
      rank: null as number | null,
    }));

    if (upsertRows.length > 0) {
      const { error: lbErr } = await supabase.from("leaderboard").upsert(upsertRows, {
        onConflict: "group_id,user_id",
      });
      if (lbErr) {
        return new Response(JSON.stringify({ error: lbErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const { data: lbRows, error: lbSelErr } = await supabase
      .from("leaderboard")
      .select("id, total_points, exact_scores")
      .eq("group_id", gid);
    if (lbSelErr) {
      return new Response(JSON.stringify({ error: lbSelErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sorted = [...(lbRows ?? [])].sort(
      (a, b) =>
        (b.total_points as number) - (a.total_points as number) ||
        (b.exact_scores as number) - (a.exact_scores as number)
    );

    let r = 1;
    for (const row of sorted) {
      const { error: rankErr } = await supabase
        .from("leaderboard")
        .update({ rank: r })
        .eq("id", row.id as string);
      if (rankErr) {
        return new Response(JSON.stringify({ error: rankErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      r += 1;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, scored: predList.length, groups_updated: groupIds.length }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
