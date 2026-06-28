/**
 * Mirrors supabase/functions/score-match/computePointsForPrediction + knockoutAdvancingBonus + double down,
 * plus structured breakdown for UI. Group-phase totals align with computeGroupStagePoints where applicable.
 */

export type MatchPhase =
  | "group"
  | "round_of_16"
  | "quarter"
  | "quarter_final"
  | "semi"
  | "semi_final"
  | "third_place"
  | "final";

export type GroupScoringRow = {
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
};

function outcome(h: number, a: number): "home" | "away" | "draw" {
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}

export function isKnockoutPhase(phase: string): boolean {
  return phase !== "group";
}

/** After 90′ result is known — winner advances if not drawn. Draw uses advancing_team from DB. */
export function resolveActualAdvancingTeam(
  homeTeam: string,
  awayTeam: string,
  advancingTeamRaw: string | null,
  H: number,
  A: number,
): string | null {
  if (H !== A) {
    return H > A ? homeTeam : awayTeam;
  }
  const adv = (advancingTeamRaw ?? "").trim();
  return adv.length > 0 ? adv : null;
}

export type PredictionInputScoring = {
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  predicted_advancing: string | null;
};

export type TierBreakdown = {
  hitResult: boolean;
  hitDiff: boolean;
  hitExact: boolean;
  resultPts: number;
  diffPts: number;
  exactPtsBase: number;
  /** Knockout-only: bonus when correct winner (non-exact score). Same pool as edge function. */
  knockoutWinnerPts: number;
};

export function computeTierBreakdown(
  H: number,
  A: number,
  phase: string,
  pred: PredictionInputScoring,
  homeTeam: string,
  awayTeam: string,
  g: GroupScoringRow,
): TierBreakdown {
  const actualResult = outcome(H, A);
  const predResult = outcome(pred.predicted_home, pred.predicted_away);
  const hitResult = predResult === actualResult;
  const hitDiff = pred.predicted_home - pred.predicted_away === H - A;
  const hitExact = pred.predicted_home === H && pred.predicted_away === A;

  const resultPts = hitResult ? g.points_correct_result : 0;
  const diffPts = hitDiff ? g.points_correct_difference : 0;

  let exactPtsBase = 0;
  let knockoutWinnerPts = 0;

  if (isKnockoutPhase(phase)) {
    if (hitExact) {
      exactPtsBase = g.points_exact_score;
    } else if (H !== A) {
      const actualWinner: "home" | "away" = H > A ? "home" : "away";
      if (
        (pred.predicted_winner === "home" || pred.predicted_winner === "away") &&
        pred.predicted_winner === actualWinner
      ) {
        knockoutWinnerPts = g.points_exact_score;
      }
    }
  } else {
    if (hitExact) exactPtsBase = g.points_exact_score;
  }

  return {
    hitResult,
    hitDiff,
    hitExact,
    resultPts,
    diffPts,
    exactPtsBase,
    knockoutWinnerPts,
  };
}

export function sumBreakdown(d: TierBreakdown): number {
  return d.resultPts + d.diffPts + d.exactPtsBase + d.knockoutWinnerPts;
}

export function applyDoubleDown(baseTotal: number, hasDoubleDown: boolean): number {
  return hasDoubleDown ? baseTotal * 2 : baseTotal;
}

export function maxPossiblePoints(g: GroupScoringRow, hasDoubleDown: boolean): number {
  const max =
    g.points_correct_result + g.points_correct_difference + g.points_exact_score;
  return applyDoubleDown(max, hasDoubleDown);
}

/** Live / preview: gold = exact score; emerald = any positive points without exact; red = zero. */
export type PointsQuality = "exact" | "good" | "wrong";

export function pointsQualityFromBreakdown(d: TierBreakdown): PointsQuality {
  const total = sumBreakdown(d);
  if (d.hitExact) return "exact";
  if (total > 0) return "good";
  return "wrong";
}
