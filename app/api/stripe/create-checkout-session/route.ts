import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { MAX_GROUPS_PER_USER } from "@/lib/constants";
import { getStripe, PRICING_TIERS, siteBaseUrl } from "@/lib/stripe";
import { ensureAiLeaderboardRow } from "@/lib/ensure-ai-leaderboard";
import { validateCouponForTier } from "@/lib/coupons";
import { getDisplayNameForMemberInsert } from "@/lib/display-name";
import type { TierKey } from "@/types/database-enums";
import type { Database } from "@/types/supabase";

type Tiebreaker = Database["public"]["Enums"]["tiebreaker_rule"];

type GroupPayload = {
  name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
  pre_tournament_bonus_champion: number;
  pre_tournament_bonus_runner_up: number;
  pre_tournament_bonus_third_place: number;
  pre_tournament_bonus_top_scorer: number;
  pre_tournament_bonus_best_player: number;
  pre_tournament_bonus_best_goalkeeper: number;
  tiebreaker_rule: Tiebreaker;
  is_public: boolean;
  description: string;
  access_mode: "open" | "protected";
  access_code: string | null;
};

const TIERS = new Set<TierKey>(["pichanga", "partido", "partidazo", "corpo"]);

export async function POST(req: Request) {
  let body: {
    locale: string;
    tier: TierKey;
    couponCode?: string | null;
    group: GroupPayload;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier;
  if (!tier || !TIERS.has(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count: adminCount } = await supabaseUser
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", user.id);
  if (adminCount != null && adminCount >= MAX_GROUPS_PER_USER) {
    return NextResponse.json({ error: "Group limit reached" }, { status: 403 });
  }

  const g = body.group;
  if (!g?.name?.trim() || !g?.slug?.trim()) {
    return NextResponse.json({ error: "Invalid group payload" }, { status: 400 });
  }

  const memberLimit = PRICING_TIERS[tier].maxMembers;
  const baseCents = PRICING_TIERS[tier].priceCents;
  const priceId = PRICING_TIERS[tier].priceId;

  if (tier === "pichanga" || baseCents === 0) {
    return NextResponse.json({ error: "Use direct creation for free tier" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const couponTrim = (body.couponCode ?? "").trim();
  let couponId: string | null = null;
  let finalCents = baseCents;
  let discountCents = 0;

  if (couponTrim) {
    const v = await validateCouponForTier(admin, couponTrim, tier);
    if (!v.valid) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    couponId = v.coupon_id;
    finalCents = v.final_price_cents;
    discountCents = v.discount_cents;
  }

  const descriptionTrimmed = g.is_public ? g.description.trim().slice(0, 200) : "";
  const accessCodeInsert = g.access_mode === "protected" ? g.access_code : null;
  const locale = (body.locale ?? "en").replace(/[^\w-]/g, "") || "en";
  const base = siteBaseUrl();

  const insertPayload = {
    name: g.name.trim(),
    slug: g.slug.trim(),
    primary_color: g.primary_color,
    secondary_color: g.secondary_color,
    admin_id: user.id,
    points_correct_result: g.points_correct_result,
    points_correct_difference: g.points_correct_difference,
    points_exact_score: g.points_exact_score,
    pre_tournament_bonus_champion: g.pre_tournament_bonus_champion,
    pre_tournament_bonus_runner_up: g.pre_tournament_bonus_runner_up,
    pre_tournament_bonus_third_place: g.pre_tournament_bonus_third_place,
    pre_tournament_bonus_top_scorer: g.pre_tournament_bonus_top_scorer,
    pre_tournament_bonus_best_player: g.pre_tournament_bonus_best_player,
    pre_tournament_bonus_best_goalkeeper: g.pre_tournament_bonus_best_goalkeeper,
    tiebreaker_rule: g.tiebreaker_rule,
    is_public: g.is_public,
    description: descriptionTrimmed,
    access_mode: g.access_mode,
    access_code: accessCodeInsert,
    tier,
    member_limit: memberLimit,
    coupon_code: couponTrim || null,
  };

  if (finalCents === 0) {
    const { data: freeIns, error: freeErr } = await admin
      .from("groups")
      .insert({
        ...insertPayload,
        payment_status: "coupon",
        amount_paid_cents: 0,
      })
      .select("id")
      .single();
    if (freeErr || !freeIns?.id) {
      return NextResponse.json({ error: freeErr?.message ?? "Could not create group" }, { status: 400 });
    }
    const gid = freeIns.id as string;
    const displayName = await getDisplayNameForMemberInsert(supabaseUser, user.id, user.email);
    const { error: memErr0 } = await admin.from("group_members").upsert(
      { group_id: gid, user_id: user.id, display_name: displayName },
      { onConflict: "group_id,user_id" },
    );
    if (memErr0) {
      await admin.from("groups").delete().eq("id", gid);
      return NextResponse.json({ error: "Could not add admin membership" }, { status: 500 });
    }
    const { error: aiErr0 } = await ensureAiLeaderboardRow(admin, gid);
    if (aiErr0) {
      console.error("ensure AI leaderboard (coupon path)", aiErr0);
      await admin.from("groups").delete().eq("id", gid);
      return NextResponse.json({ error: "Could not initialize leaderboard" }, { status: 500 });
    }
    if (couponId) {
      await admin.from("coupon_usage").insert({
        coupon_id: couponId,
        group_id: gid,
        user_id: user.id,
        discount_cents: discountCents,
        final_price_cents: 0,
      });
      const { data: cRow } = await admin.from("coupons").select("times_used").eq("id", couponId).single();
      if (cRow) {
        await admin
          .from("coupons")
          .update({ times_used: (cRow.times_used as number) + 1 })
          .eq("id", couponId);
      }
    }
    return NextResponse.json({ redirect: `${base}/${locale}/dashboard/group/${gid}`, group_id: gid });
  }

  if (!priceId) {
    return NextResponse.json({ error: "Stripe price not configured for this tier" }, { status: 500 });
  }

  const { data: inserted, error: insErr } = await admin
    .from("groups")
    .insert({
      ...insertPayload,
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    console.error("create-checkout insert group", insErr);
    return NextResponse.json({ error: insErr?.message ?? "Could not create group" }, { status: 400 });
  }

  const groupId = inserted.id as string;
  const displayName = await getDisplayNameForMemberInsert(supabaseUser, user.id, user.email);
  const { error: memErr } = await admin.from("group_members").upsert(
    {
      group_id: groupId,
      user_id: user.id,
      display_name: displayName,
    },
    { onConflict: "group_id,user_id" },
  );
  if (memErr) {
    await admin.from("groups").delete().eq("id", groupId);
    console.error("create-checkout member", memErr);
    return NextResponse.json({ error: "Could not add admin membership" }, { status: 500 });
  }

  const { error: aiErr } = await ensureAiLeaderboardRow(admin, groupId);
  if (aiErr) {
    console.error("ensure AI leaderboard (pending checkout)", aiErr);
    await admin.from("groups").delete().eq("id", groupId);
    return NextResponse.json({ error: "Could not initialize leaderboard" }, { status: 500 });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: groupId,
    customer_email: user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      group_id: groupId,
      user_id: user.id,
      coupon_id: couponId ?? "",
      discount_cents: String(discountCents),
      final_price_cents: String(finalCents),
      locale,
    },
    success_url: `${base}/${locale}/dashboard/group/${groupId}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/${locale}/dashboard/create-group?checkout=cancel`,
  });

  if (!session.url) {
    await admin.from("groups").delete().eq("id", groupId);
    return NextResponse.json({ error: "Stripe session missing URL" }, { status: 500 });
  }

  await admin.from("groups").update({ stripe_session_id: session.id }).eq("id", groupId);

  return NextResponse.json({ url: session.url, group_id: groupId });
}
