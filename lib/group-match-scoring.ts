export type GroupScoringConfig = {
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
};

export type MatchOutcome = "home" | "away" | "draw";

export function outcome(home: number, away: number): MatchOutcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export type GroupStageBreakdown = {
  correctResult: boolean;
  correctDifference: boolean;
  exactScore: boolean;
  resultPts: number;
  diffPts: number;
  exactPts: number;
  total: number;
};

/** Group-phase scoring only — matches score-match computePointsForPrediction for phase "group". */
export function computeGroupStagePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  config: GroupScoringConfig
): GroupStageBreakdown {
  const actualResult = outcome(actualHome, actualAway);
  const predResult = outcome(predHome, predAway);
  const correctResult = predResult === actualResult;
  const correctDifference = predHome - predAway === actualHome - actualAway;
  const exactScore = predHome === actualHome && predAway === actualAway;

  const resultPts = correctResult ? config.points_correct_result : 0;
  const diffPts = correctDifference ? config.points_correct_difference : 0;
  const exactPts = exactScore ? config.points_exact_score : 0;
  const total = resultPts + diffPts + exactPts;

  return {
    correctResult,
    correctDifference,
    exactScore,
    resultPts,
    diffPts,
    exactPts,
    total,
  };
}
