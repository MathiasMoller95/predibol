"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { PRICING_TIERS } from "@/lib/stripe";
import type { TierKey } from "@/types/database-enums";

const ALL: Set<string> = new Set(["pichanga", "partido", "partidazo", "corpo"]);

function consumeOnce(key: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem(key)) return false;
  window.sessionStorage.setItem(key, "1");
  return true;
}

type Props = {
  groupId: string;
};

export default function AdminUpgradeQueryToast({ groupId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations("Pricing");
  const locale = useLocale();

  useEffect(() => {
    const upgraded = searchParams.get("upgraded");
    const cancelled = searchParams.get("upgrade_cancelled");
    const newTierRaw = searchParams.get("new_tier");

    if (upgraded === "true") {
      if (consumeOnce(`predibol_admin_upgrade_ok_${groupId}_${newTierRaw ?? ""}`)) {
        if (newTierRaw && ALL.has(newTierRaw)) {
          const tier = newTierRaw as TierKey;
          const limit = PRICING_TIERS[tier].maxMembers;
          const tierName = tp(`tierNames.${tier}`);
          showToast(tp("planUpgradedToast", { tier: tierName, limit }), "success");
        } else {
          showToast(tp("planUpgradedGeneric"), "success");
        }
      }
      router.replace(`/${locale}/dashboard/group/${groupId}/admin`);
      return;
    }

    if (cancelled === "true") {
      if (consumeOnce(`predibol_admin_upgrade_cancel_${groupId}`)) {
        showToast(tp("upgradeCancelledToast"), "error");
      }
      router.replace(`/${locale}/dashboard/group/${groupId}/admin`);
    }
  }, [groupId, locale, router, searchParams, showToast, tp]);

  return null;
}
