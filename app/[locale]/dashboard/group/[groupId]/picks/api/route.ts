import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: { locale: string; groupId: string };
};

type PicksBody = {
  champion?: string | null;
  runnerUp?: string | null;
  thirdPlace?: string | null;
  topScorer?: string | null;
  bestPlayer?: string | null;
  bestGoalkeeper?: string | null;
};

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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

  const { data: firstMatch } = await supabase
    .from("matches")
    .select("match_time")
    .order("match_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  const kickoff = firstMatch?.match_time ? new Date(firstMatch.match_time as string) : null;
  const now = new Date();
  if (kickoff && now >= kickoff) {
    return NextResponse.json({ error: "PicksLocked", code: "PICKS_LOCKED" }, { status: 403 });
  }

  const body = (await request.json()) as PicksBody;
  const row = {
    user_id: user.id,
    group_id: groupId,
    champion: emptyToNull(body.champion),
    runner_up: emptyToNull(body.runnerUp),
    third_place: emptyToNull(body.thirdPlace),
    top_scorer: emptyToNull(body.topScorer),
    best_player: emptyToNull(body.bestPlayer),
    best_goalkeeper: emptyToNull(body.bestGoalkeeper),
  };

  const { error } = await supabase.from("pre_tournament_picks").upsert(row, {
    onConflict: "user_id,group_id",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, locale });
}
