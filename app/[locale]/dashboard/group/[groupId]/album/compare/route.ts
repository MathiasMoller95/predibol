import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: { locale: string; groupId: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { groupId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("sticker_album")
    .select("team,tier,earned_from_match_id")
    .eq("user_id", userId)
    .eq("group_id", groupId);

  const stickers = ((data ?? []) as { team: string; tier: string; earned_from_match_id: string | null }[]).map(
    (s) => ({ team: s.team, tier: s.tier, matchId: s.earned_from_match_id }),
  );

  return NextResponse.json({ stickers });
}
