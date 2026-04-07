import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: { locale: string; groupId: string };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { groupId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  const targetUserId = searchParams.get("targetUserId");
  if (!matchId || !targetUserId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spyRow } = await (supabase as any)
    .from("power_usage")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("power_type", "spy")
    .eq("target_user_id", targetUserId)
    .maybeSingle();

  if (!spyRow) {
    return NextResponse.json({ error: "No active spy for this target" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("spy_prediction", {
    p_group_id: groupId,
    p_match_id: matchId,
    p_target_user_id: targetUserId,
    p_spy_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data as { predicted_home: number; predicted_away: number; is_shielded: boolean }[] | null;
  if (!rows || rows.length === 0) {
    return NextResponse.json({ prediction: null });
  }

  const row = rows[0];
  if (row.is_shielded) {
    return NextResponse.json({ prediction: null, shielded: true });
  }

  return NextResponse.json({
    prediction: { home: row.predicted_home, away: row.predicted_away },
    shielded: false,
  });
}
