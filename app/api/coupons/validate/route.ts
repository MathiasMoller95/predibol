import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { validateCouponForTier } from "@/lib/coupons";
import type { TierKey } from "@/types/database-enums";

const TIERS = new Set<TierKey>(["pichanga", "partido", "partidazo", "corpo"]);

export async function POST(req: Request) {
  let body: { code?: string; tier?: string };
  try {
    body = (await req.json()) as { code?: string; tier?: string };
  } catch {
    return NextResponse.json({ valid: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const tier = (body.tier ?? "").trim() as TierKey;
  if (!TIERS.has(tier)) {
    return NextResponse.json({ valid: false, reason: "Invalid tier" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const result = await validateCouponForTier(supabase, body.code ?? "", tier);
    return NextResponse.json(result);
  } catch (e) {
    console.error("coupons/validate", e);
    return NextResponse.json({ valid: false, reason: "Server error" }, { status: 500 });
  }
}
