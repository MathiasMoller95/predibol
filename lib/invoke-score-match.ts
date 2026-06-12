import { SUPABASE_URL } from "@/lib/supabase/env";

export async function invokeScoreMatch(matchId: string): Promise<{ ok: boolean; status: number }> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { ok: false, status: 500 };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/score-match`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ match_id: matchId }),
  });

  return { ok: res.ok, status: res.status };
}
