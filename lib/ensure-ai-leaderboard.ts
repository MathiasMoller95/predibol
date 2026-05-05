import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PLAYER_ID } from "@/lib/constants";
import type { Database } from "@/types/supabase";

/** Ensures the AI benchmark row exists on leaderboard (idempotent). Service-role client recommended. */
export async function ensureAiLeaderboardRow(
  admin: SupabaseClient<Database>,
  groupId: string,
): Promise<{ error: Error | null }> {
  const { error } = await admin.from("leaderboard").upsert(
    {
      group_id: groupId,
      user_id: AI_PLAYER_ID,
      total_points: 0,
      predictions_made: 0,
      exact_scores: 0,
      correct_results: 0,
      rank: null,
      virtual_pnl: 0,
      virtual_bets_won: 0,
      virtual_bets_lost: 0,
    },
    { onConflict: "group_id,user_id", ignoreDuplicates: true },
  );
  return { error: error ? new Error(error.message) : null };
}
