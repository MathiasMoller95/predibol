"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatMatchTime } from "@/lib/format-match-time";
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

export default function DashboardGroupList({ locale, currentUserId, profileTimeZone, groups }: Props) {
  const t = useTranslations("Dashboard");
  const intlLocale = useLocale();
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);

  if (groups.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-dark-600 bg-dark-800/50 p-8 text-center">
        <h2 className="text-lg font-semibold text-white">{t("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("emptyDescription")}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          <Link
            href={`/${locale}/dashboard/create-group`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            {t("createGroup")}
          </Link>
          <Link
            href={`/${locale}/dashboard/discover`}
            className="inline-flex text-sm font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
          >
            {t("orDiscover")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {groups.map((group) => {
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
            className="relative overflow-hidden rounded-xl border border-dark-600 bg-dark-800 transition-all duration-200 hover:border-emerald-800 hover:bg-dark-700"
          >
            <div
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ backgroundColor: group.primaryColor ?? "#10b981" }}
              aria-hidden
            />

            <Link href={`/${locale}/dashboard/group/${group.id}`} className="block p-4 pl-6 sm:p-5">
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
