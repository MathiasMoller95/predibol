import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: { locale: string; groupId: string };
};

type PredictionPayload = {
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  predictedWinner: "home" | "away" | "draw" | null;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { locale, groupId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: group } = await supabase.from("groups").select("id,admin_id").eq("id", groupId).maybeSingle();
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership && group.admin_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { predictions?: PredictionPayload[] };
  const predictions = body.predictions ?? [];

  if (predictions.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const matchIds = Array.from(new Set(predictions.map((entry) => entry.matchId)));
  const { data: matches } = await supabase.from("matches").select("id,locked_at").in("id", matchIds);

  const lockMap = new Map(
    (matches ?? []).map((match) => [
      match.id,
      match.locked_at != null ? new Date(match.locked_at) : new Date(0),
    ]),
  );
  const now = new Date();
  const rows = predictions
    .filter((entry) => {
      const lockTime = lockMap.get(entry.matchId);
      return lockTime && lockTime > now;
    })
    .map((entry) => ({
      user_id: user.id,
      group_id: groupId,
      match_id: entry.matchId,
      predicted_home: entry.predictedHome,
      predicted_away: entry.predictedAway,
      predicted_winner: entry.predictedWinner,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("predictions").upsert(rows, {
    onConflict: "user_id,group_id,match_id",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, locale });
}
