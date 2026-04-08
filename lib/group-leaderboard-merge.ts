import type { LeaderboardBoardRow } from "@/app/[locale]/dashboard/group/[groupId]/leaderboard/leaderboard-board";

/** One row from `group_members` for merge. */
export type GroupMemberForLeaderboard = {
  user_id: string;
  display_name: string;
};

/** Subset of `leaderboard` table columns used when merging. */
export type LeaderboardDbRow = {
  user_id: string;
  total_points: number;
  correct_results: number;
  exact_scores: number;
  predictions_made: number;
  virtual_pnl: number | null;
  virtual_bets_won: number | null;
  virtual_bets_lost: number | null;
};

/**
 * LEFT JOIN semantics: one row per group member, stats from leaderboard when present else zeros.
 * Sort: points desc, then display name ascending (case-insensitive).
 * Rank: 1..n after sort (display rank; do not use DB rank).
 */
export function mergeGroupLeaderboardRows(
  members: GroupMemberForLeaderboard[],
  boardRows: LeaderboardDbRow[],
  resolveDisplayName: (userId: string) => string,
): LeaderboardBoardRow[] {
  const byUser = new Map(boardRows.map((r) => [r.user_id, r]));

  const merged: LeaderboardBoardRow[] = members.map((m) => {
    const row = byUser.get(m.user_id);
    return {
      user_id: m.user_id,
      rank: null,
      total_points: row?.total_points ?? 0,
      correct_results: row?.correct_results ?? 0,
      exact_scores: row?.exact_scores ?? 0,
      predictions_made: row?.predictions_made ?? 0,
      virtual_pnl: row?.virtual_pnl ?? 0,
      virtual_bets_won: row?.virtual_bets_won ?? 0,
      virtual_bets_lost: row?.virtual_bets_lost ?? 0,
      display_name: resolveDisplayName(m.user_id),
    };
  });

  merged.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" });
  });

  merged.forEach((row, i) => {
    row.rank = i + 1;
  });

  return merged;
}
