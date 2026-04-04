"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatMatchTime } from "@/lib/format-match-time";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { useEffectiveTimeZone } from "@/lib/use-effective-timezone";

export type GroupSummary = {
  id: string;
  name: string;
  adminId: string;
  primaryColor: string | null;
  totalMembers: number;
  rank: number | null;
  points: number;
  nextMatch: { id: string; homeTeam: string; awayTeam: string; matchTime: string } | null;
  hasPredictionForNextMatch: boolean;
};

type Props = {
  locale: string;
  currentUserId: string;
  profileTimeZone: string | null;
  groups: GroupSummary[];
};

function EmptyStateIllustration() {
  return (
    <svg
      className="mx-auto h-24 w-24 text-emerald-500/80"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M60 20c-22 0-40 18-40 40s18 40 40 40 40-18 40-40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
      <circle cx="60" cy="60" r="28" stroke="currentColor" strokeWidth="2" />
      <path
        d="M48 52c3-8 10-14 20-12 4 1 8 4 10 8M52 68c4 6 12 10 20 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="60" cy="60" r="6" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export default function DashboardGroupList({ locale, currentUserId, profileTimeZone, groups }: Props) {
  const t = useTranslations("Dashboard");
  const intlLocale = useLocale();
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);

  if (groups.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-dark-600 bg-dark-800/50 p-8 text-center">
        <EmptyStateIllustration />
        <h2 className="mt-4 text-lg font-semibold text-white">{t("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("emptyDescription")}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          <Link
            href={`/${locale}/dashboard/create-group`}
            className={`animate-cta-pulse inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 ${PRIMARY_BUTTON_CLASSES}`}
          >
            {t("createGroup")}
          </Link>
          <Link
            href={`/${locale}/dashboard/discover`}
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-400 underline-offset-2 transition-all duration-150 hover:text-emerald-300 hover:underline active:scale-[0.97]"
          >
            {t("orDiscover")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {groups.map((group, index) => {
        const rankLine =
          group.rank != null
            ? `🏆 ${t("rank", { rank: group.rank, total: group.totalMembers })}`
            : `🏆 ${t("noRank", { total: group.totalMembers })}`;

        const nextMatchLine = group.nextMatch
          ? `${t("nextMatchDate", { home: group.nextMatch.homeTeam, away: group.nextMatch.awayTeam })} — ${formatMatchTime(group.nextMatch.matchTime, effectiveTz, intlLocale)}`
          : t("noUpcomingMatches");

        return (
          <div
            key={group.id}
            className="animate-page-in relative overflow-hidden rounded-xl border border-dark-600 bg-dark-800 transition-all duration-200 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:bg-dark-700"
            style={{ animationDelay: `${Math.min(index * 80, 500)}ms` }}
          >
            <div
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ backgroundColor: group.primaryColor ?? "#10b981" }}
              aria-hidden
            />

            <Link href={`/${locale}/dashboard/group/${group.id}`} className="block cursor-pointer p-4 pl-6 sm:p-5">
              <h3 className="text-lg font-bold text-white">{group.name}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-bold text-gold">{rankLine}</span>
                <span className="text-slate-600">•</span>
                <span className="font-bold text-emerald-400">{t("points", { points: group.points })}</span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("nextMatch")}</p>
                <p className="mt-1 text-sm text-slate-400">{nextMatchLine}</p>
              </div>

              {group.nextMatch ? (
                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      group.hasPredictionForNextMatch
                        ? "bg-emerald-900/40 text-emerald-400"
                        : "bg-amber-900/40 text-amber-400"
                    }`}
                  >
                    {group.hasPredictionForNextMatch ? `✓ ${t("predictionSubmitted")}` : `⚠ ${t("predictionMissing")}`}
                  </span>
                </div>
              ) : null}
            </Link>

            <div className="flex flex-wrap items-center gap-3 border-t border-dark-600 px-4 py-3 pl-6 text-xs">
              <Link
                href={`/${locale}/dashboard/group/${group.id}/predict`}
                className="font-medium text-slate-500 transition-colors hover:text-emerald-400"
              >
                {t("predict")}
              </Link>
              <Link
                href={`/${locale}/dashboard/group/${group.id}/leaderboard`}
                className="font-medium text-slate-500 transition-colors hover:text-emerald-400"
              >
                {t("leaderboard")}
              </Link>
              <Link
                href={`/${locale}/dashboard/group/${group.id}/picks`}
                className="font-medium text-slate-500 transition-colors hover:text-emerald-400"
              >
                {t("picks")}
              </Link>
              {group.adminId === currentUserId ? (
                <Link
                  href={`/${locale}/dashboard/group/${group.id}/admin`}
                  className="font-medium text-slate-500 transition-colors hover:text-emerald-400"
                >
                  {t("admin")}
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
