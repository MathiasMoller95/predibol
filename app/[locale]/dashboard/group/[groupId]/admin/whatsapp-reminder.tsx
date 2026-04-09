"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type { MemberActivityRow } from "./member-activity-section";

type Props = {
  locale: string;
  groupName: string;
  slug: string;
  rows: MemberActivityRow[];
};

export default function WhatsappReminder({ locale, groupName, slug, rows }: Props) {
  const t = useTranslations("AdminPage.whatsapp");
  const { showToast } = useToast();

  const { text, incompleteCount } = useMemo(() => {
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "";
    const origin = site || (typeof window !== "undefined" ? window.location.origin : "");
    const inviteLink = `${origin}/${locale}/join/${slug}`;

    const needsNudge = rows.filter(
      (r) =>
        (r.totalMatches > 0 && r.predictionsSubmitted < r.totalMatches) || !r.picksComplete,
    );
    const lineRows = rows.filter(
      (r) => r.totalMatches > 0 && r.predictionsSubmitted < r.totalMatches,
    );
    const lines = lineRows
      .map((r) => {
        const pending = Math.max(0, r.totalMatches - r.predictionsSubmitted);
        return t("linePending", { name: r.displayName, pending });
      })
      .join("\n");

    const body = t("message", {
      groupName,
      incompleteCount: needsNudge.length,
      totalPlayers: rows.length,
      lines: lines.length > 0 ? lines : t("noLines"),
      inviteLink,
    });

    return { text: body, incompleteCount: needsNudge.length };
  }, [locale, groupName, rows, slug, t]);

  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      showToast(t("copied"), "success");
    });
  }

  function shareWa() {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mt-8 rounded-xl border border-dark-600 bg-dark-900/40 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-white">{t("sectionTitle")}</h2>
      <p className="mt-1 text-sm text-slate-400">{t("sectionHint", { count: incompleteCount })}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy()}
          className="rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          {t("copyButton")}
        </button>
        <button
          type="button"
          onClick={() => shareWa()}
          className="rounded-lg border border-dark-500 bg-dark-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-dark-600"
        >
          {t("shareWhatsapp")}
        </button>
      </div>
    </section>
  );
}
