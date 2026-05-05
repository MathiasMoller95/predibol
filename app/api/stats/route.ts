import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_PLAYER_ID } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();
  const [{ count: groups }, { data: members, error: membersErr }] = await Promise.all([
    supabase.from("groups").select("id", { count: "exact", head: true }),
    supabase.from("group_members").select("user_id"),
  ]);

  if (membersErr) {
    return NextResponse.json({ groups: groups ?? 0, active_players: 0 });
  }

  const distinct = new Set<string>();
  for (const row of members ?? []) {
    if (!row?.user_id) continue;
    if (row.user_id === AI_PLAYER_ID) continue;
    distinct.add(row.user_id);
  }

  return NextResponse.json({ groups: groups ?? 0, active_players: distinct.size });
}
