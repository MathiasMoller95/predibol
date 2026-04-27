"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export type PredictionTabId = "upcoming" | "live" | "results";

export default function PredictionTabs({
  showLiveTab,
  upcomingContent,
  liveContent,
  resultsContent,
}: {
  showLiveTab: boolean;
  upcomingContent: ReactNode;
  liveContent: ReactNode;
  resultsContent: ReactNode;
}) {
  const t = useTranslations("Predictions.tabs");
  const [tab, setTab] = useState<PredictionTabId>("upcoming");

  useEffect(() => {
    if (tab === "live" && !showLiveTab) {
      setTab("upcoming");
    }
  }, [tab, showLiveTab]);

  const panels: Record<PredictionTabId, ReactNode> = {
    upcoming: upcomingContent,
    live: liveContent,
    results: resultsContent,
  };

  return (
    <div className="mt-6">
      <div className="sticky top-0 z-30 -mx-5 mb-4 border-b border-white/10 bg-[#0A0E14] px-5 sm:-mx-6 sm:px-6">
        <nav className="flex w-full gap-1" aria-label={t("ariaLabel")}>
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
              tab === "upcoming"
                ? "text-gpri after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gpri"
                : "text-gray-400 hover:text-slate-300"
            }`}
          >
            <span aria-hidden>⚡</span>
            {t("upcoming")}
          </button>

          {showLiveTab ? (
            <button
              type="button"
              onClick={() => setTab("live")}
              className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                tab === "live"
                  ? "text-gpri after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gpri"
                  : "text-gray-400 hover:text-slate-300"
              }`}
            >
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {t("live")}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setTab("results")}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
              tab === "results"
                ? "text-gpri after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gpri"
                : "text-gray-400 hover:text-slate-300"
            }`}
          >
            <span aria-hidden>✅</span>
            {t("results")}
          </button>
        </nav>
      </div>

      <div className="transition-opacity duration-200 ease-out" style={{ opacity: 1 }}>
        {panels[tab]}
      </div>
    </div>
  );
}
