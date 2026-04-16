"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { formatMatchTime } from "@/lib/format-match-time";
import InviteShareButton from "@/components/share/invite-card";
import OnboardingOverlay, {
  hasVisitedAlbum,
  hasVisitedPicks,
  isOnboardingHintsEnabled,
  markVisitedAlbum,
  markVisitedPicks,
} from "@/components/OnboardingOverlay";
import { getFlag } from "@/lib/team-metadata";
import type { GroupAccessMode } from "@/types/supabase";
import type { BracketHubStatusKey } from "@/lib/knockout-bracket-utils";

export type RecentResultRow = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  predHome: number | null;
  predAway: number | null;
  pointsEarned: number;
  /** Simulated €1 notional 1X2 P&L; null if no prediction or odds missing */
  virtualPnl: number | null;
};

export type GroupHubData = {
  locale: string;
  groupId: string;
  currentUserId: string;
  slug: string;
  groupName: string;
  /** Public storage URL; optional */
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  isAdmin: boolean;
  memberCount: number;
  pointsResult: number;
  pointsDiff: number;
  pointsExact: number;
  profileTimezone: string;
  nextMatch: null | {
    id: string;
    homeTeam: string;
    awayTeam: string;
    matchTime: string;
    lockedAt: string;
  };
  nextMatchPrediction: null | { home: number; away: number };
  totalMatches: number;
  predictionsMadeCount: number;
  userRank: number | null;
  picksComplete: boolean;
  recentResults: RecentResultRow[];
  accessMode: GroupAccessMode;
  accessCode: string | null;
  bracketStatus: BracketHubStatusKey;
  powersRemaining: { doubleDown: number; spy: number; shield: number };
  powersLimits: { doubleDown: number; spy: number; shield: number };
  stickerCount: number;
  onboardingCompletedAt: string | null;
};

function bracketCardMeta(t: ReturnType<typeof useTranslations<"GroupHub">>, status: BracketHubStatusKey): string {
  switch (status) {
    case "comingSoon":
      return t("actions.bracketStatus.comingSoon");
    case "roundOf16":
      return t("actions.bracketStatus.roundOf16");
    case "quarterFinal":
      return t("actions.bracketStatus.quarterFinal");
    case "semiFinal":
      return t("actions.bracketStatus.semiFinal");
    case "final":
      return t("actions.bracketStatus.final");
    case "thirdPlace":
      return t("actions.bracketStatus.thirdPlace");
    case "complete":
      return t("actions.bracketStatus.complete");
    default:
      return t("actions.bracketStatus.comingSoon");
  }
}

function useLockCountdown(lockedAtIso: string | null, tickMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [lockedAtIso, tickMs]);

  return useMemo(() => {
    if (!lockedAtIso) return { msLeft: 0, closed: true };
    const lockMs = new Date(lockedAtIso).getTime();
    const msLeft = lockMs - now;
    return { msLeft, closed: msLeft <= 0 };
  }, [lockedAtIso, now]);
}

export default function GroupHubClient({ data }: { data: GroupHubData }) {
  const t = useTranslations("GroupHub");
  const { showToast } = useToast();
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [visitedPicks, setVisitedPicks] = useState(true);
  const [visitedAlbum, setVisitedAlbum] = useState(true);

  const fullUrl = useMemo(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${origin}/${data.locale}/join/${data.slug}`;
  }, [data.locale, data.slug]);

  const lockState = useLockCountdown(data.nextMatch?.lockedAt ?? null, 60_000);

  useEffect(() => {
    setHintsEnabled(isOnboardingHintsEnabled());
    setVisitedPicks(hasVisitedPicks());
    setVisitedAlbum(hasVisitedAlbum());
  }, []);


  const predictionsMeta = useMemo(() => {
    const { totalMatches, predictionsMadeCount } = data;
    if (totalMatches <= 0) {
      return t("actions.matchProgress", { count: predictionsMadeCount, total: totalMatches });
    }
    if (predictionsMadeCount >= totalMatches) {
      return t("actions.predictionsComplete");
    }
    if (predictionsMadeCount === 0) {
      return t("actions.predictionsStart");
    }
    return `${predictionsMadeCount}/${totalMatches} — ${t("actions.predictionsKeepGoing")}`;
  }, [data, t]);

  const rankLabel =
    data.userRank != null ? t("actions.yourRank", { rank: data.userRank }) : t("actions.yourRankPending");

  return (
    <div className="mt-4 space-y-4">
      <OnboardingOverlay
        locale={data.locale}
        groupId={data.groupId}
        groupName={data.groupName}
        memberCount={data.memberCount}
        exactPoints={data.pointsExact}
        isAdmin={data.isAdmin}
        onboardingCompletedAt={data.onboardingCompletedAt}
        currentUserId={data.currentUserId}
      />

      <header className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {data.logoUrl ? (
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-dark-900">
              <Image
                src={data.logoUrl}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            </span>
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-dark-900 text-base font-bold text-slate-500"
              aria-hidden
            >
              ⚽
            </span>
          )}
          <h1 className="text-lg font-bold text-white sm:text-xl">{data.groupName}</h1>
          {data.isAdmin ? (
            <span className="rounded-full bg-gpri/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gpri ring-1 ring-gpri/30">
              {t("adminBadge")}
            </span>
          ) : null}
        </div>
      </header>

      <section
        className="animate-page-in rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 motion-reduce:animate-none"
        aria-labelledby="next-match-heading"
      >
        <h2 id="next-match-heading" className="sr-only">
          {t("nextMatch.title")}
        </h2>
        {!data.nextMatch ? (
          <p className="text-sm text-slate-400">{t("nextMatch.noUpcoming")}</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <p className="min-w-0 flex-1 text-xs leading-snug text-slate-200 sm:text-sm">
                <span aria-hidden>{getFlag(data.nextMatch.homeTeam)}</span> {data.nextMatch.homeTeam}{" "}
                <span className="text-slate-500">{t("nextMatch.vs")}</span> {data.nextMatch.awayTeam}{" "}
                <span aria-hidden>{getFlag(data.nextMatch.awayTeam)}</span>
                <span className="text-slate-600"> · </span>
                <span className="text-slate-500">
                  {formatMatchTime(data.nextMatch.matchTime, data.profileTimezone, data.locale)}
                </span>
              </p>
              {!data.nextMatchPrediction && !lockState.closed ? (
                <Link
                  href={`/${data.locale}/dashboard/group/${data.groupId}/predict`}
                  className="shrink-0 text-xs font-semibold text-gpri underline-offset-2 hover:text-gpri/90 hover:underline sm:text-sm"
                >
                  {t("nextMatch.predictNow")}
                </Link>
              ) : null}
            </div>
            {lockState.closed ? (
              <p className="text-xs font-medium text-amber-400/90">{t("nextMatch.predictionsClosed")}</p>
            ) : null}
            {data.nextMatchPrediction ? (
              <p className="text-xs text-slate-400 sm:text-sm">
                <span className="text-gpri">✓</span>{" "}
                {t("nextMatch.yourPrediction", {
                  home: data.nextMatchPrediction.home,
                  away: data.nextMatchPrediction.away,
                })}
              </p>
            ) : null}
          </div>
        )}
      </section>


      <section aria-label={t("actions.ariaLabel")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {(
            [
              {
                variant: "predict" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/predict`,
                title: t("actions.predict"),
                show: true,
              },
              {
                variant: "default" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/leaderboard`,
                title: t("actions.leaderboard"),
                meta: rankLabel,
                show: true,
              },
              {
                variant: "default" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/picks`,
                title: t("actions.picks"),
                meta: data.picksComplete ? t("actions.completed") : t("actions.pending"),
                showNew: hintsEnabled && !data.picksComplete && !visitedPicks,
                onVisit: () => {
                  markVisitedPicks();
                  setVisitedPicks(true);
                },
                show: true,
              },
              {
                variant: "default" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/rules`,
                title: t("actions.rules"),
                meta: t("actions.rulesSubtitle"),
                show: true,
              },
              {
                variant: "default" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/album`,
                title: t("actions.album"),
                meta: t("actions.albumProgress", { count: data.stickerCount }),
                showNew: hintsEnabled && !visitedAlbum,
                onVisit: () => {
                  markVisitedAlbum();
                  setVisitedAlbum(true);
                },
                show: true,
              },
              {
                variant: "default" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/bracket`,
                title: t("actions.bracket"),
                meta: bracketCardMeta(t, data.bracketStatus),
                show: true,
              },
              {
                variant: "default" as const,
                href: `/${data.locale}/dashboard/group/${data.groupId}/admin`,
                title: t("actions.admin"),
                meta: t("actions.adminHint"),
                show: data.isAdmin,
              },
            ] as const
          )
            .filter((c) => c.show)
            .map((card, index) => {
              const delayMs = Math.min(index * 80, 500);
              const delayStyle = { animationDelay: `${delayMs}ms` };
              const baseMotion =
                "animate-page-in motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:scale-100";

              if (card.variant === "predict") {
                const predictLabel = card.title.replace(/^🎯\s*/, "");
                const showPulse =
                  data.totalMatches > 0 && data.predictionsMadeCount < data.totalMatches;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    style={delayStyle}
                    className={`block rounded-xl ${baseMotion} transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-gpri/15`}
                  >
                    <div className="rounded-xl bg-gradient-to-r from-gpri to-gsec p-[2px] shadow-lg shadow-gpri/20">
                      <div className="relative flex min-h-[120px] flex-col rounded-[10px] bg-dark-800 p-6 transition-colors duration-200 hover:bg-dark-800">
                        {showPulse ? (
                          <span
                            className="pointer-events-none absolute right-2 top-2 flex h-3 w-3"
                            aria-hidden
                          >
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gpri/50 motion-reduce:animate-none" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-gpri" />
                          </span>
                        ) : null}
                        <div className="flex items-start gap-2 pr-4">
                          <span className="text-3xl leading-none" aria-hidden>
                            🎯
                          </span>
                          <span className="text-sm font-semibold text-white">{predictLabel}</span>
                        </div>
                        <span className="mt-2 text-xs leading-snug text-slate-400">
                          {predictionsMeta}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={card.href}
                  href={card.href}
                  style={delayStyle}
                  onClick={() => (card as { onVisit?: () => void }).onVisit?.()}
                  className={`${baseMotion} flex min-h-[100px] flex-col rounded-xl border border-dark-600 bg-dark-800 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-gpri/30 hover:shadow-lg hover:shadow-gpri/10`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="min-w-0 truncate">{card.title}</span>
                    {(card as { showNew?: boolean }).showNew ? (
                      <span className="rounded-full bg-gpri/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gpri ring-1 ring-gpri/30">
                        NEW
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 text-xs leading-snug text-slate-400">{card.meta}</span>
                </Link>
              );
            })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-gray-400">
          <span className={data.powersRemaining.doubleDown < data.powersLimits.doubleDown ? "text-amber-400" : ""}>
            ⚡ {data.powersRemaining.doubleDown}/{data.powersLimits.doubleDown}
          </span>
          <span className={data.powersRemaining.spy < data.powersLimits.spy ? "text-blue-400" : ""}>
            🔍 {data.powersRemaining.spy}/{data.powersLimits.spy}
          </span>
          <span className={data.powersRemaining.shield < data.powersLimits.shield ? "text-gpri" : ""}>
            🛡️ {data.powersRemaining.shield}/{data.powersLimits.shield}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{t("recentResults.title")}</h2>
          <Link
            href={`/${data.locale}/dashboard/group/${data.groupId}/predict`}
            className="text-sm font-medium text-gpri hover:text-gpri/90"
          >
            {t("recentResults.seeAll")}
          </Link>
        </div>
        {data.recentResults.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t("recentResults.noResults")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.recentResults.map((row) => (
              <li
                key={row.matchId}
                className="rounded-lg border border-dark-600 bg-dark-900/40 px-3 py-3 text-sm text-slate-300"
              >
                <p className="font-medium text-white">
                  <span aria-hidden>{getFlag(row.homeTeam)}</span> {row.homeTeam}{" "}
                  <span className="tabular-nums font-bold text-gsec">
                    {row.homeScore}-{row.awayScore}
                  </span>{" "}
                  {row.awayTeam} <span aria-hidden>{getFlag(row.awayTeam)}</span>
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {row.predHome != null && row.predAway != null
                    ? t("recentResults.yourPrediction", { home: row.predHome, away: row.predAway })
                    : t("recentResults.noPrediction")}{" "}
                  <span
                    className={
                      row.pointsEarned > 0 ? "font-mono font-semibold text-gpri" : "font-mono text-slate-500"
                    }
                  >
                    {t("recentResults.points", { points: row.pointsEarned })}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.isAdmin ? (
        <section className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <h2 className="text-lg font-semibold text-white">{t("invite.title")}</h2>
          <div className="mt-4">
            <InviteShareButton
              groupName={data.groupName}
              locale={data.locale}
              inviteUrl={fullUrl}
              logoUrl={data.logoUrl}
              primaryColor={data.primaryColor}
              secondaryColor={data.secondaryColor}
              accessMode={data.accessMode}
              accessCode={data.accessCode}
              onCopied={() => showToast(t("invite.copied"), "success")}
              onCopyFailed={() => showToast(t("invite.copyFailed"), "error")}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

