import type { TierKey } from "@/types/database-enums";

export const TIER_ORDER: TierKey[] = ["pichanga", "partido", "partidazo", "corpo"];

export function tierRank(tier: TierKey): number {
  const i = TIER_ORDER.indexOf(tier);
  return i < 0 ? -1 : i;
}

/** Strictly higher tiers only (for upgrade targets). */
export function higherTiersThan(current: TierKey): TierKey[] {
  const r = tierRank(current);
  return TIER_ORDER.filter((t) => tierRank(t) > r);
}

export function isStrictTierUpgrade(current: TierKey, next: TierKey): boolean {
  return tierRank(next) > tierRank(current);
}
