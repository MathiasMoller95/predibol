import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_PLAYER_ID } from "@/lib/constants";
import { getDisplayNameForMemberInsert } from "@/lib/display-name";

type RouteContext = { params: { groupId: string } };

export async function POST(_req: Request, context: RouteContext) {
  const groupId = context.params.groupId;
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const displayName = await getDisplayNameForMemberInsert(supabase, user.id, user.email);

  const { data: raw, error: rpcErr } = await supabase.rpc("join_group_if_room", {
    p_group_id: groupId,
    p_display_name: displayName,
  });

  if (rpcErr) {
    console.error("join_group_if_room", rpcErr);
    return NextResponse.json({ error: "join_failed", code: "rpc_error" }, { status: 500 });
  }

  const result = raw as { ok?: boolean; error?: string; already_member?: boolean };

  if (!result?.ok) {
    const code = result?.error ?? "unknown";
    const status =
      code === "group_full"
        ? 409
        : code === "group_pending" || code === "group_not_joinable"
          ? 403
          : code === "not_authenticated"
            ? 401
            : 400;
    if (code === "group_full") {
      const { data: gRow } = await supabase.from("groups").select("member_limit").eq("id", groupId).maybeSingle();
      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .neq("user_id", AI_PLAYER_ID);
      return NextResponse.json(
        {
          error: code,
          count: count ?? 0,
          limit: (gRow?.member_limit as number) ?? 0,
        },
        { status },
      );
    }
    return NextResponse.json({ error: code }, { status });
  }

  return NextResponse.json({ ok: true, already_member: result.already_member === true });
}
