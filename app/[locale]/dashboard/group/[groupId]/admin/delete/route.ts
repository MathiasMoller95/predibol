import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: { locale: string; groupId: string } };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { groupId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_group", {
    p_group_id: groupId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete group" },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
