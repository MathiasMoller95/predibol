"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { PRICING_TIERS } from "@/lib/stripe";
import type { TierKey } from "@/types/database-enums";

const TIER_ORDER: TierKey[] = ["pichanga", "partido", "partidazo", "corpo"];

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export type CouponUiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; discount_cents: number; final_price_cents: number; coupon_id: string }
  | { status: "error"; message: string };

type Props = {
  selectedTier: TierKey;
  onSelectTier: (t: TierKey) => void;
  couponCode: string;
  onCouponCodeChange: (v: string) => void;
  couponState: CouponUiState;
  onApplyCoupon: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
};

export default function CreateGroupTierStep({
  selectedTier,
  onSelectTier,
  couponCode,
  onCouponCodeChange,
  couponState,
  onApplyCoupon,
  onBack,
  onSubmit,
  submitLabel,
  busy,
}: Props) {
  const t = useTranslations("Pricing");
  const [couponOpen, setCouponOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t("choosePlan")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("choosePlanSubtitle")}</p>
        <p className="mt-3 text-xs text-slate-500">{t("allFeaturesLine")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-24 lg:grid-cols-4 lg:pb-0">
        {TIER_ORDER.map((tier) => {
          const cfg = PRICING_TIERS[tier];
          const selected = selectedTier === tier;
          const popular = tier === "partido";
          return (
            <button
              key={tier}
              type="button"
              onClick={() => onSelectTier(tier)}
              className={`relative rounded-xl border p-3 text-left transition sm:p-4 ${
                selected ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-dark-600 bg-dark-800 hover:border-dark-500"
              }`}
            >
              {popular ? (
                <span className="absolute right-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dark-900">
                  {t("mostPopular")}
                </span>
              ) : null}
              <p className="text-base font-semibold text-white sm:text-lg">{t(`tierNames.${tier}`)}</p>
              <p className="mt-1 text-sm text-slate-400">{t("upToPlayers", { n: cfg.maxMembers })}</p>
              <div className="mt-2 sm:mt-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  {cfg.priceCents === 0 ? (
                    <span className="text-base font-bold text-emerald-400 sm:text-lg">{t("free")}</span>
                  ) : (
                    <span className="text-base font-bold text-white sm:text-lg">{formatUsd(cfg.priceCents)} USD</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{cfg.clpRef}</p>
              </div>
              {tier === "corpo" ? (
                <div className="mt-3 border-t border-dark-600 pt-3 text-xs text-slate-400">
                  <p>{t("corpoContactLine")}</p>
                  <p className="mt-2 flex flex-wrap gap-3">
                    <a className="text-emerald-400 hover:underline" href="mailto:mnmoller@uc.cl">
                      {t("corpoEmail")}
                    </a>
                    <a
                      className="text-emerald-400 hover:underline"
                      href="https://wa.me/56991959923?text=Hi!%20I%27m%20interested%20in%20a%20Corpo%20group%20for%20Predibol"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("corpoWhatsapp")}
                    </a>
                  </p>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedTier !== "pichanga" ? (
        <div className="rounded-xl border border-dark-600 bg-dark-800/60 p-4">
          <button
            type="button"
            onClick={() => setCouponOpen((v) => !v)}
            className="text-left text-sm font-medium text-slate-300 hover:text-white hover:underline"
          >
            {t("haveCode")}
          </button>

          {couponOpen ? (
            <div className="mt-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="coupon-code"
                  value={couponCode}
                  onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="CODE"
                  autoComplete="off"
                />
                <button
                  type="button"
                  disabled={busy || couponState.status === "loading" || !couponCode.trim()}
                  onClick={onApplyCoupon}
                  className="shrink-0 rounded-lg border border-dark-500 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-dark-700 disabled:opacity-50"
                >
                  {couponState.status === "loading" ? "…" : t("apply")}
                </button>
              </div>
              {couponState.status === "valid" ? (
                <p className="mt-2 text-sm text-emerald-400">
                  {t("discountApplied")} — {t("finalPrice", { price: formatUsd(couponState.final_price_cents) })}
                </p>
              ) : null}
              {couponState.status === "error" ? (
                <p className="mt-2 text-sm text-red-400">{couponState.message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-4 bg-gradient-to-b from-transparent to-[#0A0E14] px-4 pb-4 pt-4 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pb-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="rounded-lg border border-dark-500 px-4 py-2 text-sm text-slate-300 hover:bg-dark-700 disabled:opacity-50"
          >
            {t("back")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className={`rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 ${PRIMARY_BUTTON_CLASSES}`}
          >
            {busy ? "…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
