import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { TierKey } from "@/types/database-enums";
import { PRICING_TIERS } from "@/lib/stripe";

export type CouponValidateResult =
  | { valid: true; discount_cents: number; final_price_cents: number; coupon_id: string }
  | { valid: false; reason: string };

function isTierApplicable(tier: TierKey, applicable: string[] | null): boolean {
  if (!applicable || applicable.length === 0) return false;
  return applicable.includes(tier);
}

export async function validateCouponForTier(
  supabase: SupabaseClient<Database>,
  rawCode: string,
  tier: TierKey,
): Promise<CouponValidateResult> {
  if (tier === "pichanga") {
    return { valid: false, reason: "Coupons do not apply to the free tier" };
  }

  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, reason: "Missing code" };
  }

  const baseCents = PRICING_TIERS[tier].priceCents;
  if (baseCents <= 0) {
    return { valid: false, reason: "No payment required for this tier" };
  }

  const { data: row, error } = await supabase.from("coupons").select("*").eq("code", code).maybeSingle();

  if (error || !row) {
    return { valid: false, reason: "Invalid or expired code" };
  }

  if (!row.active) {
    return { valid: false, reason: "Invalid or expired code" };
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "Invalid or expired code" };
  }

  if (row.max_uses != null && row.times_used >= row.max_uses) {
    return { valid: false, reason: "Invalid or expired code" };
  }

  const tiers = row.applicable_tiers as string[] | null;
  if (!isTierApplicable(tier, tiers)) {
    return { valid: false, reason: "Code not valid for this tier" };
  }

  const ctype = row.type as string;
  let discount = 0;
  if (ctype === "percent") {
    const pct = Math.min(100, Math.max(0, Number(row.value)));
    discount = Math.floor((baseCents * pct) / 100);
  } else if (ctype === "fixed") {
    discount = Math.max(0, Number(row.value));
  } else if (ctype === "free") {
    discount = baseCents;
  } else {
    return { valid: false, reason: "Invalid or expired code" };
  }

  discount = Math.min(discount, baseCents);
  const final_price_cents = Math.max(0, baseCents - discount);

  return {
    valid: true,
    discount_cents: discount,
    final_price_cents,
    coupon_id: row.id as string,
  };
}
