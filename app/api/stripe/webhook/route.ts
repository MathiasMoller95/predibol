import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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
