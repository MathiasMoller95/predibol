/**
 * Builds a map user_id -> streak (consecutive finished matches where points_earned > 0).
 * Rows must belong to one group; sorting is by match_time descending (most recent first).
 */
export function positiveStreaksByUser<
  Row extends {
    user_id: string;
    points_earned: number | null | undefined;
    match_time_match: string;
  },
>(orderedDescByMatchTime: Row[]): Record<string, number> {
  const byUserSorted = new Map<string, Row[]>();

  const sortedAsc = [...orderedDescByMatchTime].sort(
    (a, b) => new Date(b.match_time_match).getTime() - new Date(a.match_time_match).getTime(),
  );

  for (const row of sortedAsc) {
    const uid = row.user_id;
    const existing = byUserSorted.get(uid);
    if (existing) {
      existing.push(row);
    } else {
      byUserSorted.set(uid, [row]);
    }
  }

  const streaks: Record<string, number> = {};
  for (const [uid, rows] of Array.from(byUserSorted.entries())) {
    let n = 0;
    for (const r of rows) {
      const pts = Number(r.points_earned ?? 0);
      if (!Number.isFinite(pts) || pts <= 0) break;
      n += 1;
    }
    streaks[uid] = n;
  }
  return streaks;
}
