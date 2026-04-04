"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { formatMatchTime } from "@/lib/format-match-time";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import InviteCardShareButton from "@/components/share/invite-card";
import { getFlag } from "@/lib/team-metadata";
import type { GroupAccessMode } from "@/types/supabase";

export type LeaderboardPreviewRow = {
  userId: string;
  rank: number | null;
  points: number;
  displayName: string;
};

export type RecentResultRow = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  predHome: number | null;
  predAway: number | null;
  pointsEarned: number;
};

export type GroupHubData = {
  locale: string;
  groupId: string;
  slug: string;
  groupName: string;
  primaryColor: string | null;
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
  leaderboardTop: LeaderboardPreviewRow[];
  showLeaderboardSelfRow: boolean;
  leaderboardSelf: LeaderboardPreviewRow | null;
  recentResults: RecentResultRow[];
  accessMode: GroupAccessMode;
  accessCode: string | null;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
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
  const tAccess = useTranslations("AccessCode");
  const { showToast } = useToast();
  const accent = data.primaryColor ?? "#10b981";

  const fullUrl = useMemo(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${origin}/${data.locale}/join/${data.slug}`;
  }, [data.locale, data.slug]);

  const whatsappHref = useMemo(() => {
    const text =
      data.accessMode === "protected" && data.accessCode
        ? tAccess("whatsappProtected", {
            groupName: data.groupName,
            link: fullUrl,
            code: data.accessCode,
          })
        : tAccess("whatsappOpen", { groupName: data.groupName, link: fullUrl });
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [data.accessCode, data.accessMode, data.groupName, fullUrl, tAccess]);

  const lockState = useLockCountdown(data.nextMatch?.lockedAt ?? null, 60_000);

  async function onCopyInvite() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast(t("invite.copied"), "success");
    } catch {
      showToast(t("invite.copyFailed"), "error");
    }
  }

  async function onCopyAccessCode() {
    if (!data.accessCode) return;
    try {
      await navigator.clipboard.writeText(data.accessCode);
      showToast(tAccess("codeCopied"), "success");
    } catch {
      showToast(t("invite.copyFailed"), "error");
    }
  }


  const scoringSummary = t("scoringRules", {
    result: data.pointsResult,
    difference: data.pointsDiff,
    exact: data.pointsExact,
  });

  const matchProgress = t("actions.matchProgress", {
    count: data.predictionsMadeCount,
    total: data.totalMatches,
  });

  const rankLabel =
    data.userRank != null ? t("actions.yourRank", { rank: data.userRank }) : t("actions.yourRankPending");

  const countdownParts = useMemo(() => {
    if (!data.nextMatch || lockState.closed) return null;
    const ms = Math.max(0, lockState.msLeft);
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    return { days, hours, minutes };
  }, [data.nextMatch, lockState.closed, lockState.msLeft]);

  return (
    <div className="mt-6 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-white">{data.groupName}</h1>
            {data.isAdmin ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                {t("adminBadge")}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {t("memberCount", { count: data.memberCount })} · {scoringSummary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span
            className="h-3 w-3 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <span
            className="hidden h-1 w-full max-w-[120px] rounded-full sm:block"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
        </div>
      </header>

      <section
        className="animate-page-in rounded-xl border border-dark-600 bg-dark-800 p-5 motion-reduce:animate-none"
        aria-labelledby="next-match-heading"
      >
        <h2 id="next-match-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("nextMatch.title")}
        </h2>
        {!data.nextMatch ? (
          <p className="mt-3 text-sm text-slate-400">{t("nextMatch.noUpcoming")}</p>
        ) : (
          <div className="mt-3">
            <p className="text-lg font-semibold text-white">
              <span aria-hidden>{getFlag(data.nextMatch.homeTeam)}</span> {data.nextMatch.homeTeam}{" "}
              <span className="text-slate-500">{t("nextMatch.vs")}</span> {data.nextMatch.awayTeam}{" "}
              <span aria-hidden>{getFlag(data.nextMatch.awayTeam)}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatMatchTime(data.nextMatch.matchTime, data.profileTimezone, data.locale)}
            </p>

            {lockState.closed ? (
              <p className="mt-3 text-sm font-medium text-amber-400/90">{t("nextMatch.predictionsClosed")}</p>
            ) : countdownParts ? (
              <p className="mt-3 text-sm text-emerald-400/90" aria-live="polite">
                {t("nextMatch.locksIn", {
                  days: countdownParts.days,
                  hours: pad2(countdownParts.hours),
                  minutes: pad2(countdownParts.minutes),
                })}
              </p>
            ) : null}

            {data.nextMatchPrediction ? (
              <p className="mt-3 text-sm text-slate-300">
                <span className="text-emerald-400">✓</span>{" "}
                {t("nextMatch.yourPrediction", {
                  home: data.nextMatchPrediction.home,
                  away: data.nextMatchPrediction.away,
                })}
              </p>
            ) : !lockState.closed ? (
              <Link
                href={`/${data.locale}/dashboard/group/${data.groupId}/predict`}
                className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline"
              >
                {t("nextMatch.predictNow")}
              </Link>
            ) : null}
          </div>
        )}
      </section>


      <section aria-label={t("actions.ariaLabel")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              {
                href: `/${data.locale}/dashboard/group/${data.groupId}/predict`,
                title: t("actions.predict"),
                meta: matchProgress,
                show: true,
              },
              {
                href: `/${data.locale}/dashboard/group/${data.groupId}/leaderboard`,
                title: t("actions.leaderboard"),
                meta: rankLabel,
                show: true,
              },
              {
                href: `/${data.locale}/dashboard/group/${data.groupId}/picks`,
                title: t("actions.picks"),
                meta: data.picksComplete ? t("actions.completed") : t("actions.pending"),
                show: true,
              },
              {
                href: `/${data.locale}/dashboard/group/${data.groupId}/admin`,
                title: t("actions.admin"),
                meta: t("actions.adminHint"),
                show: data.isAdmin,
              },
            ] as const
          )
            .filter((c) => c.show)
            .map((card, index) => (
              <Link
                key={card.href}
                href={card.href}
                style={{ animationDelay: `${Math.min(index * 80, 500)}ms` }}
                className="animate-page-in flex min-h-[100px] flex-col rounded-xl border border-dark-600 bg-dark-800 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <span className="text-sm font-semibold text-white">{card.title}</span>
                <span className="mt-2 text-xs leading-snug text-slate-400">{card.meta}</span>
              </Link>
            ))}
        </div>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{t("leaderboardPreview.title")}</h2>
          <Link
            href={`/${data.locale}/dashboard/group/${data.groupId}/leaderboard`}
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            {t("leaderboardPreview.seeAll")}
          </Link>
        </div>
        {data.leaderboardTop.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t("leaderboardPreview.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.leaderboardTop.map((row) => {
              const r = row.rank;
              const medal = row.rank === 1 ? "🥇 " : row.rank === 2 ? "🥈 " : row.rank === 3 ? "🥉 " : "";
              const tierBorder =
                r === 1
                  ? "border-l-4 border-yellow-400"
                  : r === 2
                    ? "border-l-4 border-slate-300"
                    : r === 3
                      ? "border-l-4 border-amber-600"
                      : "";
              return (
                <li
                  key={row.userId}
                  className={`flex items-center justify-between gap-3 rounded-lg border border-dark-600 bg-dark-900/40 px-3 py-2 text-sm ${tierBorder}`}
                >
                  <span className="min-w-0 truncate text-slate-200">
                    <span aria-hidden>{medal}</span>
                    {row.rank ?? "—"} · {row.displayName}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums font-semibold text-emerald-400">{row.points}</span>
                </li>
              );
            })}
            {data.showLeaderboardSelfRow && data.leaderboardSelf ? (
              <>
                <li className="py-1 text-center text-xs text-slate-500">···</li>
                <li className="flex items-center justify-between gap-3 rounded-lg border border-dark-600 bg-emerald-900/20 px-3 py-2 text-sm ring-1 ring-inset ring-emerald-500/30">
                  <span className="min-w-0 truncate font-medium text-slate-100">
                    {data.leaderboardSelf.rank ?? "—"} · {data.leaderboardSelf.displayName}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums font-semibold text-emerald-400">
                    {data.leaderboardSelf.points}
                  </span>
                </li>
              </>
            ) : null}
          </ul>
        )}
      </section>


      <section className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{t("recentResults.title")}</h2>
          <Link
            href={`/${data.locale}/dashboard/group/${data.groupId}/predict`}
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
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
                  <span className="tabular-nums font-bold text-emerald-300">
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
                      row.pointsEarned > 0 ? "font-mono font-semibold text-emerald-400" : "font-mono text-slate-500"
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
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0 flex-1 break-all rounded-lg border border-dark-600 bg-dark-900 p-3 font-mono text-xs text-slate-300 sm:text-sm">
              {fullUrl}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCopyInvite()}
                className={`shrink-0 rounded-lg border border-dark-500 bg-dark-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-dark-600 ${PRIMARY_BUTTON_CLASSES}`}
              >
                {t("copyLink")}
              </button>
              {data.accessMode === "protected" && data.accessCode ? (
                <button
                  type="button"
                  onClick={() => void onCopyAccessCode()}
                  className={`shrink-0 rounded-lg border border-dark-500 bg-dark-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-dark-600 ${PRIMARY_BUTTON_CLASSES}`}
                >
                  {tAccess("copyCode")}
                </button>
              ) : null}
              <InviteCardShareButton groupName={data.groupName} locale={data.locale} />
            </div>
            {data.accessMode === "protected" && data.accessCode ? (
              <p className="w-full text-center text-sm font-mono text-emerald-300 sm:text-left">
                {tAccess("linkAndCode", { code: data.accessCode })}
              </p>
            ) : null}
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 inline-flex w-full min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
          >
            {t("shareWhatsApp")}
          </a>
        </section>
      ) : null}
    </div>
  );
}

