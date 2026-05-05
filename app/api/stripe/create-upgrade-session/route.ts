import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStripe, PRICING_TIERS, siteBaseUrl } from "@/lib/stripe";
import { higherTiersThan, isStrictTierUpgrade } from "@/lib/tier-order";
import type { TierKey } from "@/types/database-enums";

export const runtime = "nodejs";

const ALL_TIERS = new Set<TierKey>(["pichanga", "partido", "partidazo", "corpo"]);

function paidAtIso() {
  return new Date().toISOString();
}

export async function POST(req: Request) {
  let body: { groupId?: string; newTier?: TierKey; locale?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const groupId = (body.groupId ?? "").trim();
  const newTier = body.newTier;
  if (!groupId || !newTier || !ALL_TIERS.has(newTier)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("groups")
    .select("id,admin_id,tier,amount_paid_cents,payment_status")
    .eq("id", groupId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (row.admin_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentTier = row.tier as TierKey;
  if (!ALL_TIERS.has(currentTier) || !isStrictTierUpgrade(currentTier, newTier)) {
    return NextResponse.json({ error: "Invalid upgrade target" }, { status: 400 });
  }

  if (!higherTiersThan(currentTier).includes(newTier)) {
    return NextResponse.json({ error: "Invalid upgrade target" }, { status: 400 });
  }

  const paidSoFar = Number(row.amount_paid_cents ?? 0) || 0;
  const targetList = PRICING_TIERS[newTier].priceCents;
  const upgradePriceCents = Math.max(0, targetList - paidSoFar);

  const admin = createServiceRoleClient();
  const paidAt = paidAtIso();
  const cfg = PRICING_TIERS[newTier];

  if (upgradePriceCents === 0) {
    const { error: upErr } = await admin
      .from("groups")
      .update({
        tier: newTier,
        member_limit: cfg.maxMembers,
        amount_paid_cents: cfg.priceCents,
        payment_status: "paid",
        paid_at: paidAt,
      })
      .eq("id", groupId)
      .eq("admin_id", user.id);

    if (upErr) {
      console.error("upgrade $0 update", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const locale = (body.locale ?? "en").replace(/[^\w-]/g, "") || "en";
  const base = siteBaseUrl();
  const stripe = getStripe();
  const productName = `Predibol upgrade to ${cfg.label}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: upgradePriceCents,
          product_data: { name: productName },
        },
        quantity: 1,
      },
    ],
    metadata: {
      group_id: groupId,
      user_id: user.id,
      new_tier: newTier,
      upgrade: "true",
    },
    success_url: `${base}/${locale}/dashboard/group/${groupId}/admin?upgraded=true&new_tier=${encodeURIComponent(newTier)}`,
    cancel_url: `${base}/${locale}/dashboard/group/${groupId}/admin?upgrade_cancelled=true`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe session missing URL" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
