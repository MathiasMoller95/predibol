"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

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
  groups: GroupSummary[];
};

export default function DashboardGroupList({ locale, currentUserId, groups }: Props) {
  const t = useTranslations("Dashboard");
  const intlLocale = useLocale();

  const formatter = new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" });

  if (groups.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">{t("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-700">{t("emptyDescription")}</p>
        <div className="mt-5">
          <Link
            href={`/${locale}/dashboard/create-group`}
            className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            {t("createGroup")}
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
          ? `${t("nextMatchDate", { home: group.nextMatch.homeTeam, away: group.nextMatch.awayTeam })} — ${formatter.format(new Date(group.nextMatch.matchTime))}`
          : t("noUpcomingMatches");

        return (
          <div
            key={group.id}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div
              className="absolute left-0 top-0 h-full w-1.5"
              style={{ backgroundColor: group.primaryColor ?? "#16a34a" }}
              aria-hidden
            />

            <Link href={`/${locale}/dashboard/group/${group.id}`} className="block p-4 pl-6">
              <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
                <span className="font-medium text-slate-900">{rankLine}</span>
                <span className="text-slate-400">•</span>
                <span className="font-medium text-slate-900">{t("points", { points: group.points })}</span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("nextMatch")}</p>
                <p className="mt-1 text-sm text-slate-800">{nextMatchLine}</p>
              </div>

              {group.nextMatch ? (
                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      group.hasPredictionForNextMatch ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {group.hasPredictionForNextMatch ? `✓ ${t("predictionSubmitted")}` : `⚠ ${t("predictionMissing")}`}
                  </span>
                </div>
              ) : null}
            </Link>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-3 pl-6 text-sm">
              <Link href={`/${locale}/dashboard/group/${group.id}/predict`} className="font-medium text-emerald-700 hover:text-emerald-800">
                {t("predict")}
              </Link>
              <Link
                href={`/${locale}/dashboard/group/${group.id}/leaderboard`}
                className="font-medium text-slate-700 hover:text-slate-900"
              >
                {t("leaderboard")}
              </Link>
              <Link href={`/${locale}/dashboard/group/${group.id}/picks`} className="font-medium text-slate-700 hover:text-slate-900">
                {t("picks")}
              </Link>
              {group.adminId === currentUserId ? (
                <Link href={`/${locale}/dashboard/group/${group.id}/admin`} className="font-medium text-slate-700 hover:text-slate-900">
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

