import Stripe from "stripe";
import type { TierKey } from "@/types/database-enums";

export type PricingTierConfig = {
  maxMembers: number;
  priceCents: number;
  priceId: string | null;
  label: string;
  /** Informative CLP ballpark for the tier card UI (not charged). */
  clpRef: string;
};

export const PRICING_TIERS: Record<TierKey, PricingTierConfig> = {
  pichanga: { maxMembers: 7, priceCents: 0, priceId: null, label: "Pichanga", clpRef: "Gratis" },
  partido: {
    maxMembers: 22,
    priceCents: 999,
    priceId: process.env.STRIPE_PRICE_PARTIDO ?? null,
    label: "Partido",
    clpRef: "~$8.500 CLP",
  },
  partidazo: {
    maxMembers: 50,
    priceCents: 2999,
    priceId: process.env.STRIPE_PRICE_PARTIDAZO ?? null,
    label: "Partidazo",
    clpRef: "~$25.000 CLP",
  },
  corpo: {
    maxMembers: 500,
    priceCents: 8999,
    priceId: process.env.STRIPE_PRICE_CORPO ?? null,
    label: "Corpo",
    clpRef: "~$75.000 CLP",
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
