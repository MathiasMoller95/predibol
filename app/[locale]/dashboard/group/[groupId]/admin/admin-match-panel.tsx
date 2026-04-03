"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
};

export type PredictionLite = {
  match_id: string;
  user_id: string;
};

type Props = {
  profileTimeZone: string | null;
  matches: AdminMatch[];
  predictions: PredictionLite[];
  totalMembers: number;
};

type ScoreInput = {
  home: string;
  away: string;
};

function formatPhaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case "group":
      return "Group Stage";
    case "round_of_16":
      return "Round of 16";
    case "quarter":
      return "Quarter-finals";
    case "semi":
      return "Semi-finals";
    case "final":
      return "Final";
    default:
      return phase;
  }
}

function statusStyles(status: MatchStatus) {
  if (status === "finished") {
    return "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-700/50";
  }
  if (status === "live") {
    return "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50";
  }
  return "bg-dark-700 text-slate-300 ring-1 ring-dark-500";
}

export default function AdminMatchPanel({ profileTimeZone, matches, predictions, totalMembers }: Props) {
  const t = useTranslations("AdminPage");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [isSavingByMatch, setIsSavingByMatch] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatWhen = useMemo(() => {
    return (iso: string) => formatMatchTime(iso, effectiveTz, locale);
  }, [effectiveTz, locale]);

  const submissionsByMatch = useMemo(() => {
    const map = new Map<string, Set<string>>();
    predictions.forEach((prediction) => {
      const current = map.get(prediction.match_id);
      if (current) {
        current.add(prediction.user_id);
      } else {
        map.set(prediction.match_id, new Set([prediction.user_id]));
      }
    });
    return map;
  }, [predictions]);

  const upcoming = useMemo(
    () => {
      const now = new Date();
      return matches
        .filter((match) => match.status === "scheduled" && new Date(match.match_time) > now)
        .slice(0, 5);
    },
    [matches],
  );

  const matchesByPhase = useMemo(() => {
    const map = new Map<MatchPhase, AdminMatch[]>();
    matches.forEach((match) => {
      const existing = map.get(match.phase);
      if (existing) {
        existing.push(match);
      } else {
        map.set(match.phase, [match]);
      }
    });
    return map;
  }, [matches]);

  const phaseOrder: MatchPhase[] = ["group", "round_of_16", "quarter", "semi", "final"];
  const phaseEntries = phaseOrder
    .map((phase) => ({ phase, items: matchesByPhase.get(phase) ?? [] }))
    .filter((entry) => entry.items.length > 0);

  const activePhase = phaseEntries.find((entry) => entry.items.some((match) => match.status !== "finished"))?.phase;

  function getScoreInput(match: AdminMatch): ScoreInput {
    return scores[match.id] ?? {
      home: match.home_score != null ? String(match.home_score) : "",
      away: match.away_score != null ? String(match.away_score) : "",
    };
  }

  function setScore(matchId: string, key: "home" | "away", value: string) {
    if (value.startsWith("-")) {
      return;
    }
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        home: key === "home" ? value : (prev[matchId]?.home ?? ""),
        away: key === "away" ? value : (prev[matchId]?.away ?? ""),
      },
    }));
  }

  async function markAsFinished(match: AdminMatch) {
    const input = getScoreInput(match);
    const homeScore = Number(input.home);
    const awayScore = Number(input.away);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setMessage({ type: "error", text: t("error") });
      return;
    }

    const confirmed = window.confirm(
      t("confirmMessage", {
        home: match.home_team,
        away: match.away_team,
        homeScore,
        awayScore,
      }),
    );

    if (!confirmed) {
      return;
    }

    setIsSavingByMatch((prev) => ({ ...prev, [match.id]: true }));
    setMessage(null);

    const { error } = await supabase
      .from("matches")
      .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
      .eq("id", match.id);

    if (error) {
      setMessage({ type: "error", text: t("error") });
      setIsSavingByMatch((prev) => ({ ...prev, [match.id]: false }));
      return;
    }

    setMessage({ type: "success", text: t("success") });
    setIsSavingByMatch((prev) => ({ ...prev, [match.id]: false }));
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-8">
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
                          ? "bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-700/50"
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

      <section>
        <h2 className="text-lg font-semibold text-white">{t("matchResults")}</h2>
        {message ? (
          <p className={`mt-3 text-sm font-medium ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
            {message.text}
          </p>
        ) : null}

        <div className="mt-3 space-y-4">
          {phaseEntries.map(({ phase, items }) => {
            const allFinished = items.every((match) => match.status === "finished");
            const defaultOpen = activePhase ? phase === activePhase : !allFinished;

            return (
              <details key={phase} open={defaultOpen} className="rounded-lg border border-dark-600 bg-dark-700/50">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white">
                  {formatPhaseLabel(phase)}
                </summary>
                <div className="space-y-3 border-t border-dark-600 p-3">
                  {items.map((match) => {
                    const input = getScoreInput(match);
                    const isFinished = match.status === "finished";
                    const isSaving = isSavingByMatch[match.id] === true;

                    return (
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
                            {match.status === "finished"
                              ? t("finished")
                              : match.status === "live"
                                ? t("live")
                                : t("scheduled")}
                          </span>
                        </div>

                        {isFinished ? (
                          <p className="mt-3 text-base font-semibold text-emerald-400 sm:mt-0">
                            {match.home_score ?? 0} - {match.away_score ?? 0}
                          </p>
                        ) : (
                          <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:items-end">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={input.home}
                                onChange={(event) => setScore(match.id, "home", event.target.value)}
                                className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                aria-label={t("homeScore")}
                              />
                              <span className="text-slate-500">-</span>
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={input.away}
                                onChange={(event) => setScore(match.id, "away", event.target.value)}
                                className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                aria-label={t("awayScore")}
                              />
                            </div>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => {
                                void markAsFinished(match);
                              }}
                              className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t("markFinished")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
