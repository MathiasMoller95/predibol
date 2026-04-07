import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

type MatchPhase =
  | "group"
  | "round_of_16"
  | "quarter"
  | "quarter_final"
  | "semi"
  | "semi_final"
  | "third_place"
  | "final";

type MatchRow = {
  id: string;
  phase: MatchPhase;
  home_score: number | null;
  away_score: number | null;
  home_team: string;
  away_team: string;
  status: string;
  knockout_label: string | null;
  advancing_team: string | null;
  ai_home_score: number | null;
  ai_away_score: number | null;
};

const AI_PLAYER_ID = "00000000-0000-0000-0000-000000000001";

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
  predicted_advancing: string | null;
  points_earned: number;
};

function outcome(h: number, a: number): "home" | "away" | "draw" {
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}

/** Virtual €1 bet on predicted 1X2 — skip match if odds for that arm are missing. */
function virtualBetDelta(
  predHome: number,
  predAway: number,
  H: number,
  A: number,
  homeWinOdds: number | null,
  drawOdds: number | null,
  awayWinOdds: number | null
): { pnl: number; won: number; lost: number } | null {
  const predictedOutcome = outcome(predHome, predAway);
  const actualOutcome = outcome(H, A);
  const oddsMap = {
    home: homeWinOdds,
    draw: drawOdds,
    away: awayWinOdds,
  } as const;
  const selectedOdds = oddsMap[predictedOutcome];
  if (selectedOdds == null || Number.isNaN(Number(selectedOdds))) return null;
  const odds = Number(selectedOdds);
  if (predictedOutcome === actualOutcome) {
    return { pnl: parseFloat((odds - 1).toFixed(2)), won: 1, lost: 0 };
  }
  return { pnl: -1, won: 0, lost: 1 };
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

/** Knockout 90-min draw + correct advancing side. Uses points_correct_result as bonus; could be its own column later. */
function knockoutAdvancingBonus(
  H: number,
  A: number,
  phase: MatchPhase,
  actualAdvancing: string | null,
  p: PredictionRow,
  g: GroupRow
): number {
  if (!isKnockoutPhase(phase) || H !== A || !actualAdvancing) return 0;
  if (p.predicted_home !== p.predicted_away) return 0;
  const pred = (p.predicted_advancing ?? "").trim();
  if (!pred || pred !== actualAdvancing.trim()) return 0;
  return g.points_correct_result;
}

function resolveActualAdvancingTeam(m: MatchRow, H: number, A: number): string | null {
  if (H !== A) {
    return H > A ? m.home_team : m.away_team;
  }
  const adv = (m.advancing_team ?? "").trim();
  return adv.length > 0 ? adv : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  let body: { match_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const matchId = body.match_id?.trim();
  if (!matchId) {
    return new Response(JSON.stringify({ error: "match_id is required" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select(
      "id, phase, home_score, away_score, home_team, away_team, status, knockout_label, advancing_team, ai_home_score, ai_away_score",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr || !match) {
    return new Response(JSON.stringify({ error: "Match not found" }), {
      status: 404,
      headers: jsonHeaders,
    });
  }

  const m = match as MatchRow;
  if (m.status !== "finished") {
    return new Response(
      JSON.stringify({ error: "Match must have status finished to score" }),
      { status: 409, headers: jsonHeaders }
    );
  }
  if (m.home_score === null || m.away_score === null) {
    return new Response(
      JSON.stringify({ error: "Match must have home_score and away_score" }),
      { status: 409, headers: jsonHeaders }
    );
  }

  const H = m.home_score;
  const A = m.away_score;
  const actualAdvancing = resolveActualAdvancingTeam(m, H, A);

  const { data: predictions, error: predErr } = await supabase
    .from("predictions")
    .select(
      "id, user_id, group_id, match_id, predicted_home, predicted_away, predicted_winner, predicted_advancing, points_earned",
    )
    .eq("match_id", matchId);

  if (predErr) {
    return new Response(JSON.stringify({ error: predErr.message }), {
      status: 500,
      headers: jsonHeaders,
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
        headers: jsonHeaders,
      });
    }
    for (const row of groups ?? []) {
      groupMap.set((row as GroupRow).id, row as GroupRow);
    }
  }

  for (const p of predList) {
    const g = groupMap.get(p.group_id);
    if (!g) continue;
    let pts = computePointsForPrediction(
      H,
      A,
      m.phase,
      p.predicted_home,
      p.predicted_away,
      p.predicted_winner,
      g
    );
    pts += knockoutAdvancingBonus(H, A, m.phase, actualAdvancing, p, g);

    const { data: ddPower } = await supabase
      .from("power_usage")
      .select("id")
      .eq("user_id", p.user_id)
      .eq("group_id", p.group_id)
      .eq("match_id", matchId)
      .eq("power_type", "double_down")
      .maybeSingle();
    if (ddPower) pts *= 2;

    const { error: upErr } = await supabase.from("predictions").update({ points_earned: pts }).eq("id", p.id);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  }

  if (isKnockoutPhase(m.phase) && m.knockout_label && actualAdvancing && actualAdvancing !== "TBD") {
    const token = `W-${m.knockout_label}`;
    const { data: targets, error: tErr } = await supabase
      .from("matches")
      .select("id, home_source, away_source")
      .or(`home_source.eq.${token},away_source.eq.${token}`);

    if (tErr) {
      return new Response(JSON.stringify({ error: tErr.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    for (const row of targets ?? []) {
      const r = row as { id: string; home_source: string | null; away_source: string | null };
      if (r.home_source === token) {
        const { error: u1 } = await supabase.from("matches").update({ home_team: actualAdvancing }).eq("id", r.id);
        if (u1) {
          return new Response(JSON.stringify({ error: u1.message }), {
            status: 500,
            headers: jsonHeaders,
          });
        }
      }
      if (r.away_source === token) {
        const { error: u2 } = await supabase.from("matches").update({ away_team: actualAdvancing }).eq("id", r.id);
        if (u2) {
          return new Response(JSON.stringify({ error: u2.message }), {
            status: 500,
            headers: jsonHeaders,
          });
        }
      }
    }
  }

  // --- AI Player: auto-insert predictions for every group ---
  if (m.ai_home_score != null && m.ai_away_score != null) {
    const aiHome = m.ai_home_score;
    const aiAway = m.ai_away_score;

    for (const gid of groupIds) {
      const g = groupMap.get(gid);
      if (!g) continue;

      // Ensure AI player is a member of this group
      await supabase.from("group_members").upsert(
        { group_id: gid, user_id: AI_PLAYER_ID, role: "member" },
        { onConflict: "group_id,user_id" }
      );

      // Calculate AI points for this match
      let aiPts = computePointsForPrediction(H, A, m.phase, aiHome, aiAway, null, g);
      aiPts += knockoutAdvancingBonus(H, A, m.phase, actualAdvancing, {
        id: "",
        user_id: AI_PLAYER_ID,
        group_id: gid,
        match_id: matchId,
        predicted_home: aiHome,
        predicted_away: aiAway,
        predicted_winner: null,
        predicted_advancing: null,
        points_earned: 0,
      }, g);

      // Upsert AI prediction row for audit trail
      await supabase.from("predictions").upsert(
        {
          user_id: AI_PLAYER_ID,
          group_id: gid,
          match_id: matchId,
          predicted_home: aiHome,
          predicted_away: aiAway,
          predicted_winner: null,
          predicted_advancing: null,
          points_earned: aiPts,
        },
        { onConflict: "user_id,group_id,match_id" }
      );
    }
  }

  for (const gid of groupIds) {
    const { data: allPreds, error: apErr } = await supabase
      .from("predictions")
      .select("user_id, predicted_home, predicted_away, points_earned, match_id")
      .eq("group_id", gid);
    if (apErr) {
      return new Response(JSON.stringify({ error: apErr.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const matchIdSet = [...new Set((allPreds ?? []).map((row: { match_id: string }) => row.match_id))];
    const { data: matchesRows, error: mErr } = await supabase
      .from("matches")
      .select("id, home_score, away_score, status, home_win_odds, draw_odds, away_win_odds")
      .in("id", matchIdSet);
    if (mErr) {
      return new Response(JSON.stringify({ error: mErr.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const matchById = new Map<
      string,
      {
        home_score: number | null;
        away_score: number | null;
        status: string;
        home_win_odds: number | null;
        draw_odds: number | null;
        away_win_odds: number | null;
      }
    >();
    for (const row of matchesRows ?? []) {
      matchById.set(row.id as string, {
        home_score: row.home_score as number | null,
        away_score: row.away_score as number | null,
        status: row.status as string,
        home_win_odds: row.home_win_odds as number | null,
        draw_odds: row.draw_odds as number | null,
        away_win_odds: row.away_win_odds as number | null,
      });
    }

    const byUser = new Map<
      string,
      {
        total_points: number;
        predictions_made: number;
        exact_scores: number;
        correct_results: number;
        virtual_pnl: number;
        virtual_bets_won: number;
        virtual_bets_lost: number;
      }
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
          virtual_pnl: 0,
          virtual_bets_won: 0,
          virtual_bets_lost: 0,
        });
      }
      const agg = byUser.get(uid)!;
      agg.total_points += pts;
      agg.predictions_made += 1;

      const mr = matchById.get(mid);
      if (mr && mr.status === "finished" && mr.home_score !== null && mr.away_score !== null) {
        const h = mr.home_score;
        const a = mr.away_score;
        if (predHome === h && predAway === a) {
          agg.exact_scores += 1;
        }
        if (outcome(predHome, predAway) === outcome(h, a)) {
          agg.correct_results += 1;
        }
        const vb = virtualBetDelta(
          predHome,
          predAway,
          h,
          a,
          mr.home_win_odds,
          mr.draw_odds,
          mr.away_win_odds
        );
        if (vb) {
          agg.virtual_pnl = parseFloat((agg.virtual_pnl + vb.pnl).toFixed(2));
          agg.virtual_bets_won += vb.won;
          agg.virtual_bets_lost += vb.lost;
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
      virtual_pnl: agg.virtual_pnl,
      virtual_bets_won: agg.virtual_bets_won,
      virtual_bets_lost: agg.virtual_bets_lost,
      rank: null as number | null,
    }));

    if (upsertRows.length > 0) {
      const { error: lbErr } = await supabase.from("leaderboard").upsert(upsertRows, {
        onConflict: "group_id,user_id",
      });
      if (lbErr) {
        return new Response(JSON.stringify({ error: lbErr.message }), {
          status: 500,
          headers: jsonHeaders,
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
        headers: jsonHeaders,
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
          headers: jsonHeaders,
        });
      }
      r += 1;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, scored: predList.length, groups_updated: groupIds.length }),
    { status: 200, headers: jsonHeaders }
  );
});
