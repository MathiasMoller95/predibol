import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true });
  return NextResponse.json({ groups: count ?? 0 });
}
