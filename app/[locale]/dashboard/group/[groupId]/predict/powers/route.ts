import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PowerType } from "@/lib/constants";

type RouteContext = {
  params: { locale: string; groupId: string };
};

const VALID_POWERS: PowerType[] = ["double_down", "spy", "shield"];

const POWER_COL: Record<PowerType, string> = {
  double_down: "powers_double_down",
  spy: "powers_spy",
  shield: "powers_shield",
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { groupId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    matchId?: string;
    powerType?: string;
    targetUserId?: string | null;
  };

  const { matchId, powerType, targetUserId } = body;
  if (!matchId || !powerType || !VALID_POWERS.includes(powerType as PowerType)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const pt = powerType as PowerType;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase as any)
    .from("groups")
    .select(`id,admin_id,${POWER_COL[pt]}`)
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership && group.admin_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id,locked_at")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.locked_at && new Date(match.locked_at) <= new Date()) {
    return NextResponse.json({ error: "Match is locked" }, { status: 409 });
  }

  const limit = group[POWER_COL[pt]] as number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { count } = await db
    .from("power_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .eq("power_type", pt);
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: "Limit reached" }, { status: 409 });
  }

  const { data: row, error } = await db
    .from("power_usage")
    .insert({
      user_id: user.id,
      group_id: groupId,
      match_id: matchId,
      power_type: pt,
      target_user_id: pt === "spy" ? (targetUserId ?? null) : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already active" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { groupId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { matchId?: string; powerType?: string };
  const { matchId, powerType } = body;
  if (!matchId || !powerType || !VALID_POWERS.includes(powerType as PowerType)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id,locked_at")
    .eq("id", matchId)
    .maybeSingle();
  if (match?.locked_at && new Date(match.locked_at) <= new Date()) {
    return NextResponse.json({ error: "Match is locked" }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("power_usage")
    .delete()
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("power_type", powerType);

  return NextResponse.json({ ok: true });
}
