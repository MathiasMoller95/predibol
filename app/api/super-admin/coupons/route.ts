import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    code: string;
    type: "percent" | "fixed" | "free";
    value?: number;
    max_uses?: number | null;
    applicable_tiers?: string[];
    expires_at?: string | null;
    active?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code.trim().toUpperCase();
  if (!code || !body.type) {
    return NextResponse.json({ error: "Missing code or type" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("coupons")
    .insert({
      code,
      type: body.type,
      value: body.type === "free" ? 0 : Number(body.value ?? 0),
      max_uses: body.max_uses ?? null,
      applicable_tiers: body.applicable_tiers?.length ? body.applicable_tiers : ["partido", "partidazo", "corpo"],
      expires_at: body.expires_at ?? null,
      active: body.active ?? true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ id: data?.id });
}
