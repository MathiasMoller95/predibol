import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, PRICING_TIERS } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { ensureAiLeaderboardRow } from "@/lib/ensure-ai-leaderboard";
import { isStrictTierUpgrade } from "@/lib/tier-order";
import type { TierKey } from "@/types/database-enums";

export const runtime = "nodejs";

const ALL_TIERS = new Set<TierKey>(["pichanga", "partido", "partidazo", "corpo"]);

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error("stripe webhook verify", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { error: idemErr } = await admin.from("stripe_events").insert({ id: event.id });
  if (idemErr) {
    if ((idemErr as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("stripe_events insert", idemErr);
    return NextResponse.json({ error: "idem error" }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.upgrade === "true") {
        const groupId = (session.metadata.group_id ?? "").trim();
        const newTierRaw = (session.metadata.new_tier ?? "").trim() as TierKey;
        const userId = (session.metadata.user_id ?? "").trim();
        const amountCents = session.amount_total ?? 0;
        const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

        if (!groupId || !ALL_TIERS.has(newTierRaw) || !userId) {
          console.error("webhook upgrade: bad metadata", session.id, session.metadata);
          return NextResponse.json({ received: true });
        }

        const { data: g, error: gErr } = await admin
          .from("groups")
          .select("id,admin_id,tier,amount_paid_cents")
          .eq("id", groupId)
          .single();

        if (gErr || !g) {
          console.error("webhook upgrade: group not found", groupId, gErr);
          return NextResponse.json({ received: true });
        }

        if (g.admin_id !== userId) {
          console.error("webhook upgrade: admin mismatch", groupId);
          return NextResponse.json({ received: true });
        }

        const currentTier = g.tier as TierKey;
        if (!ALL_TIERS.has(currentTier) || !isStrictTierUpgrade(currentTier, newTierRaw)) {
          console.error("webhook upgrade: invalid tier transition", currentTier, newTierRaw);
          return NextResponse.json({ received: true });
        }

        const paidSoFar = Number(g.amount_paid_cents ?? 0) || 0;
        const expectedDelta = Math.max(0, PRICING_TIERS[newTierRaw].priceCents - paidSoFar);
        if (amountCents !== expectedDelta) {
          console.error("webhook upgrade: amount mismatch", { amountCents, expectedDelta, session: session.id });
          return NextResponse.json({ received: true });
        }

        const paidAt = new Date().toISOString();
        const cfg = PRICING_TIERS[newTierRaw];
        const { error: upErr } = await admin
          .from("groups")
          .update({
            tier: newTierRaw,
            member_limit: cfg.maxMembers,
            amount_paid_cents: cfg.priceCents,
            payment_status: "paid",
            paid_at: paidAt,
            stripe_payment_intent_id: pi ?? null,
            stripe_session_id: session.id,
          })
          .eq("id", groupId);

        if (upErr) {
          console.error("webhook upgrade: update failed", upErr);
          return NextResponse.json({ error: "upgrade update failed" }, { status: 500 });
        }

        return NextResponse.json({ received: true });
      }

      const groupId = (session.metadata?.group_id ?? session.client_reference_id ?? "").trim();
      if (!groupId) {
        console.error("webhook: missing group id", session.id);
        return NextResponse.json({ received: true });
      }

      const paidAt = new Date().toISOString();
      const amountCents = session.amount_total ?? 0;
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

      await admin
        .from("groups")
        .update({
          payment_status: "paid",
          stripe_session_id: session.id,
          stripe_payment_intent_id: pi ?? null,
          paid_at: paidAt,
          amount_paid_cents: amountCents,
        })
        .eq("id", groupId)
        .eq("payment_status", "pending");

      const { error: aiLbErr } = await ensureAiLeaderboardRow(admin, groupId);
      if (aiLbErr) {
        console.error("webhook ensure AI leaderboard", aiLbErr);
        return NextResponse.json({ error: "ai leaderboard" }, { status: 500 });
      }

      const couponId = (session.metadata?.coupon_id ?? "").trim();
      const userId = (session.metadata?.user_id ?? "").trim();
      const discountCents = Number(session.metadata?.discount_cents ?? 0) || 0;
      const finalCents = Number(session.metadata?.final_price_cents ?? amountCents) || amountCents;

      if (couponId && userId) {
        await admin.from("coupon_usage").insert({
          coupon_id: couponId,
          group_id: groupId,
          user_id: userId,
          discount_cents: discountCents,
          final_price_cents: finalCents,
        });
        const { data: cRow } = await admin.from("coupons").select("times_used").eq("id", couponId).single();
        if (cRow) {
          await admin
            .from("coupons")
            .update({ times_used: (cRow.times_used as number) + 1 })
            .eq("id", couponId);
        }
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.upgrade === "true") {
        return NextResponse.json({ received: true });
      }
      const groupId = (session.metadata?.group_id ?? session.client_reference_id ?? "").trim();
      if (groupId) {
        await admin.from("groups").delete().eq("id", groupId).eq("payment_status", "pending");
      }
    }
  } catch (e) {
    console.error("stripe webhook handler", e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
