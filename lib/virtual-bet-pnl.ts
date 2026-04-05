/** Virtual €1 bet on 1X2 outcome only — for fun, not real money. */

export type MatchOutcome = "home" | "away" | "draw";

export function matchOutcomeFromScore(homeScore: number, awayScore: number): MatchOutcome {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

export function virtualBetPnlForMatch(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  homeWinOdds: number | null,
  drawOdds: number | null,
  awayWinOdds: number | null
): number | null {
  const predicted = matchOutcomeFromScore(predHome, predAway);
  const actual = matchOutcomeFromScore(actualHome, actualAway);
  const oddsMap: Record<MatchOutcome, number | null> = {
    home: homeWinOdds,
    draw: drawOdds,
    away: awayWinOdds,
  };
  const selected = oddsMap[predicted];
  if (selected == null || Number.isNaN(Number(selected))) return null;
  const odds = Number(selected);
  if (predicted === actual) {
    return parseFloat((odds - 1).toFixed(2));
  }
  return -1;
}
