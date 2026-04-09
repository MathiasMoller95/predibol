import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  sourceGroupId?: string;
};

async function userCanAccessGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  gid: string,
): Promise<boolean> {
  const { data: row } = await supabase.from("groups").select("admin_id").eq("id", gid).maybeSingle();
  if (!row) return false;
  if ((row as { admin_id: string }).admin_id === userId) return true;
  const { data: mem } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", gid)
    .eq("user_id", userId)
    .maybeSingle();
  return !!mem;
}

export async function POST(request: Request, { params }: { params: { groupId: string } }) {
  const targetGroupId = params.groupId;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceGroupId = body.sourceGroupId?.trim();
  if (!sourceGroupId) {
    return NextResponse.json({ error: "sourceGroupId is required" }, { status: 400 });
  }
  if (sourceGroupId === targetGroupId) {
    return NextResponse.json({ error: "Source and target must differ" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [okTarget, okSource] = await Promise.all([
    userCanAccessGroup(supabase, user.id, targetGroupId),
    userCanAccessGroup(supabase, user.id, sourceGroupId),
  ]);

  if (!okTarget || !okSource) {
    return NextResponse.json({ error: "You must belong to both groups" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { data: unlockableRows, error: unlockErr } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "scheduled")
    .gt("locked_at", nowIso);

  if (unlockErr) {
    return NextResponse.json({ error: unlockErr.message }, { status: 500 });
  }

  const unlockableIds = (unlockableRows ?? []).map((r) => (r as { id: string }).id);
  if (unlockableIds.length === 0) {
    return NextResponse.json({ copiedCount: 0 });
  }

  const [{ data: sourcePreds, error: srcErr }, { data: targetPreds, error: tgtErr }] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_id,predicted_home,predicted_away,predicted_winner,predicted_advancing")
      .eq("group_id", sourceGroupId)
      .eq("user_id", user.id)
      .in("match_id", unlockableIds),
    supabase.from("predictions").select("match_id").eq("group_id", targetGroupId).eq("user_id", user.id).in("match_id", unlockableIds),
  ]);

  if (srcErr || tgtErr) {
    return NextResponse.json({ error: srcErr?.message ?? tgtErr?.message ?? "Query failed" }, { status: 500 });
  }

  const targetHas = new Set((targetPreds ?? []).map((r) => (r as { match_id: string }).match_id));

  const rows = (sourcePreds ?? [])
    .map((r) => r as {
      match_id: string;
      predicted_home: number;
      predicted_away: number;
      predicted_winner: "home" | "away" | "draw" | null;
      predicted_advancing: string | null;
    })
    .filter((p) => !targetHas.has(p.match_id))
    .map((p) => ({
      user_id: user.id,
      group_id: targetGroupId,
      match_id: p.match_id,
      predicted_home: p.predicted_home,
      predicted_away: p.predicted_away,
      predicted_winner: p.predicted_winner,
      predicted_advancing: p.predicted_advancing,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ copiedCount: 0 });
  }

  const { error: insErr } = await supabase.from("predictions").insert(rows);

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ copiedCount: rows.length });
}
