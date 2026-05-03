import Stripe from "stripe";
import type { TierKey } from "@/types/database-enums";

export const PRICING_TIERS: Record<
  TierKey,
  { maxMembers: number; priceCents: number; priceId: string | null; label: string }
> = {
  pichanga: { maxMembers: 7, priceCents: 0, priceId: null, label: "Pichanga" },
  partido: {
    maxMembers: 25,
    priceCents: 999,
    priceId: process.env.STRIPE_PRICE_PARTIDO ?? null,
    label: "Partido",
  },
  partidazo: {
    maxMembers: 100,
    priceCents: 2999,
    priceId: process.env.STRIPE_PRICE_PARTIDAZO ?? null,
    label: "Partidazo",
  },
  corpo: {
    maxMembers: 500,
    priceCents: 8999,
    priceId: process.env.STRIPE_PRICE_CORPO ?? null,
    label: "Corpo",
  },
};

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key, { typescript: true });
}

export function siteBaseUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
