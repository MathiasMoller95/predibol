"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { PRICING_TIERS } from "@/lib/stripe";
import { higherTiersThan } from "@/lib/tier-order";
import type { TierKey } from "@/types/database-enums";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type Props = {
  groupId: string;
  currentTier: TierKey;
  amountPaidCents: number | null;
};

export default function GroupUpgradePanel({ groupId, currentTier, amountPaidCents }: Props) {
  const tp = useTranslations("Pricing");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [busyTier, setBusyTier] = useState<TierKey | null>(null);

  const options = higherTiersThan(currentTier);
  if (options.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-dark-600 bg-dark-800/80 p-5">
        <h2 className="text-lg font-semibold text-white">{tp("upgradePlanSection")}</h2>
        <p className="mt-2 text-sm text-slate-400">{tp("highestTier")}</p>
      </section>
    );
  }

  const paid = Number(amountPaidCents ?? 0) || 0;

  async function onUpgrade(newTier: TierKey) {
    if (busyTier) return;
    setBusyTier(newTier);
    try {
      const res = await fetch("/api/stripe/create-upgrade-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, newTier, locale }),
      });
      const data = (await res.json()) as { url?: string; ok?: boolean; error?: string };

      if (!res.ok) {
        showToast(data.error ?? tp("upgradeFailed"), "error");
        setBusyTier(null);
        return;
      }

      if (data.ok === true) {
        const limit = PRICING_TIERS[newTier].maxMembers;
        const tierName = tp(`tierNames.${newTier}`);
        showToast(tp("planUpgradedToast", { tier: tierName, limit }), "success");
        router.refresh();
        setBusyTier(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      showToast(tp("upgradeFailed"), "error");
      setBusyTier(null);
    } catch {
      showToast(tp("upgradeFailed"), "error");
      setBusyTier(null);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-dark-600 bg-dark-800/80 p-5">
      <h2 className="text-lg font-semibold text-white">{tp("upgradePlanSection")}</h2>
      <p className="mt-1 text-sm text-slate-500">{tp("upgradePlanSubtitle")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((tier) => {
          const cfg = PRICING_TIERS[tier];
          const upgradeCents = Math.max(0, cfg.priceCents - paid);
          const busy = busyTier === tier;
          return (
            <div key={tier} className="rounded-xl border border-dark-600 bg-dark-900/40 p-4">
              <p className="text-base font-semibold text-white">{tp(`tierNames.${tier}`)}</p>
              <p className="mt-1 text-sm text-slate-400">{tp("upToPlayers", { n: cfg.maxMembers })}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{tp("upgradePriceLabel")}</p>
              <p className="mt-0.5 text-lg font-bold text-emerald-400">{formatUsd(upgradeCents)}</p>
              <button
                type="button"
                disabled={!!busyTier}
                onClick={() => void onUpgrade(tier)}
                className={`mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 ${PRIMARY_BUTTON_CLASSES}`}
              >
                {busy ? "…" : tp("upgradeButton")}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
