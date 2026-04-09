"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatMatchTime } from "@/lib/format-match-time";
import { useEffectiveTimeZone } from "@/lib/use-effective-timezone";
import type { MatchPhase, MatchStatus } from "@/types/supabase";

export type AdminMatch = {
  id: string;
  phase: MatchPhase;
  home_team: string;
  away_team: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  knockout_label: string | null;
  home_source: string | null;
  away_source: string | null;
  advancing_team: string | null;
};

export type PredictionLite = {
  match_id: string;
  user_id: string;
  submitted_at?: string;
};

type Props = {
  profileTimeZone: string | null;
  matches: AdminMatch[];
  predictions: PredictionLite[];
  totalMembers: number;
  isSuperAdmin: boolean;
};

function statusStyles(status: MatchStatus) {
  if (status === "finished") return "bg-gpri/15 text-gsec ring-1 ring-gpri/40";
  if (status === "live") return "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50";
  return "bg-dark-700 text-slate-300 ring-1 ring-dark-500";
}

export default function AdminMatchPanel({
  profileTimeZone,
  matches,
  predictions,
  totalMembers,
  isSuperAdmin: isSA,
}: Props) {
  const t = useTranslations("AdminPage");
  const locale = useLocale();
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);

  const formatWhen = useMemo(
    () => (iso: string) => formatMatchTime(iso, effectiveTz, locale),
    [effectiveTz, locale],
  );

  const submissionsByMatch = useMemo(() => {
    const map = new Map<string, Set<string>>();
    predictions.forEach((p) => {
      const cur = map.get(p.match_id);
      if (cur) cur.add(p.user_id);
      else map.set(p.match_id, new Set([p.user_id]));
    });
    return map;
  }, [predictions]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return matches
      .filter((m) => m.status === "scheduled" && new Date(m.match_time) > now)
      .slice(0, 5);
  }, [matches]);

  const finishedMatches = useMemo(
    () => matches.filter((m) => m.status === "finished").slice(0, 10),
    [matches],
  );

  return (
    <div className="mt-6 space-y-8">
      {/* Pending predictions */}
      <section>
        <h2 className="text-lg font-semibold text-white">{t("pendingPredictions")}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t("noUpcoming")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {upcoming.map((match) => {
              const submitted = submissionsByMatch.get(match.id)?.size ?? 0;
              const allIn = totalMembers > 0 && submitted >= totalMembers;
              return (
                <div key={match.id} className="rounded-lg border border-dark-600 bg-dark-700/50 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">
                        {match.home_team} vs {match.away_team}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{formatWhen(match.match_time)}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {t("predictionsSubmitted", { count: submitted, total: totalMembers })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        allIn
                          ? "bg-gpri/15 text-gsec ring-1 ring-gpri/40"
                          : "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50"
                      }`}
                    >
                      {allIn ? t("allPredictionsIn") : "!"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Match results — read-only */}
      <section>
        <h2 className="text-lg font-semibold text-white">{t("matchResults")}</h2>

        <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-800/30 px-4 py-3">
          <p className="text-sm text-slate-400">{t("managedByAdmin")}</p>
          {isSA && (
            <Link
              href={`/${locale}/dashboard/super-admin`}
              className="mt-1 inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              {t("goToSuperAdmin")}
            </Link>
          )}
        </div>

        {finishedMatches.length > 0 && (
          <div className="mt-4 space-y-2">
            {finishedMatches.map((match) => (
              <div
                key={match.id}
                className="rounded-lg border border-dark-600 bg-dark-800 p-3 sm:flex sm:items-center sm:justify-between sm:gap-3"
              >
                <div>
                  <p className="font-medium text-white">
                    {match.home_team} vs {match.away_team}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatWhen(match.match_time)}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(match.status)}`}>
                    {t("finished")}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-gpri sm:mt-0">
                  {match.home_score ?? 0} - {match.away_score ?? 0}
                  {match.advancing_team && (
                    <span className="ml-2 text-xs font-normal text-slate-400">→ {match.advancing_team}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
