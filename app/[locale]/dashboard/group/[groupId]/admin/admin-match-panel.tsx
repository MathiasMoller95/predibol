"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { formatMatchTime } from "@/lib/format-match-time";
import { useEffectiveTimeZone } from "@/lib/use-effective-timezone";
import type { MatchPhase, MatchStatus } from "@/types/supabase";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { teamFlags } from "@/lib/team-metadata";

const TEAM_OPTIONS = Object.keys(teamFlags).sort((a, b) => a.localeCompare(b));

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

function isKnockoutPhase(phase: MatchPhase): boolean {
  return phase !== "group";
}

function formatPhaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case "group":
      return "Group Stage";
    case "round_of_16":
      return "Round of 16";
    case "quarter":
    case "quarter_final":
      return "Quarter-finals";
    case "semi":
    case "semi_final":
      return "Semi-finals";
    case "third_place":
      return "Third place";
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
  const { showToast } = useToast();
  const supabase = createClient();
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [isSavingByMatch, setIsSavingByMatch] = useState<Record<string, boolean>>({});
  const [advancingByMatchId, setAdvancingByMatchId] = useState<Record<string, string>>({});
  const [resolveOpenFor, setResolveOpenFor] = useState<string | null>(null);
  const [resolveHome, setResolveHome] = useState("");
  const [resolveAway, setResolveAway] = useState("");
  const [resolveSavingId, setResolveSavingId] = useState<string | null>(null);

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

  const upcoming = useMemo(() => {
    const now = new Date();
    return matches
      .filter((match) => match.status === "scheduled" && new Date(match.match_time) > now)
      .slice(0, 5);
  }, [matches]);

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

  const phaseOrder: MatchPhase[] = [
    "group",
    "round_of_16",
    "quarter_final",
    "quarter",
    "semi_final",
    "semi",
    "third_place",
    "final",
  ];
  const phaseEntries = phaseOrder
    .map((phase) => ({ phase, items: matchesByPhase.get(phase) ?? [] }))
    .filter((entry) => entry.items.length > 0);

  const groupPhaseEntries = phaseEntries.filter((e) => e.phase === "group");
  const knockoutPhaseEntries = phaseEntries.filter((e) => e.phase !== "group");

  const activePhase = phaseEntries.find((entry) => entry.items.some((match) => match.status !== "finished"))?.phase;
  const activeKnockoutPhase = knockoutPhaseEntries.find((entry) =>
    entry.items.some((m) => m.status !== "finished"),
  )?.phase;

  function getScoreInput(match: AdminMatch): ScoreInput {
    return (
      scores[match.id] ?? {
        home: match.home_score != null ? String(match.home_score) : "",
        away: match.away_score != null ? String(match.away_score) : "",
      }
    );
  }

  function setScore(match: AdminMatch, key: "home" | "away", value: string) {
    if (value.startsWith("-")) {
      return;
    }
    const prevIn = scores[match.id];
    const next: ScoreInput = {
      home: key === "home" ? value : (prevIn?.home ?? (match.home_score != null ? String(match.home_score) : "")),
      away: key === "away" ? value : (prevIn?.away ?? (match.away_score != null ? String(match.away_score) : "")),
    };

    setScores((prev) => ({
      ...prev,
      [match.id]: next,
    }));

    if (!isKnockoutPhase(match.phase)) return;

    const nh = Number(next.home);
    const na = Number(next.away);
    if (
      next.home !== "" &&
      next.away !== "" &&
      Number.isInteger(nh) &&
      Number.isInteger(na) &&
      nh >= 0 &&
      na >= 0 &&
      nh !== na
    ) {
      const winner = nh > na ? match.home_team : match.away_team;
      setAdvancingByMatchId((prev) => ({ ...prev, [match.id]: winner }));
    } else if (next.home !== "" && next.away !== "" && nh === na) {
      setAdvancingByMatchId((prev) => ({ ...prev, [match.id]: "" }));
    }
  }

  function effectiveAdvancing(match: AdminMatch, input: ScoreInput): string {
    const pick = (advancingByMatchId[match.id] ?? "").trim();
    const h = Number(input.home);
    const a = Number(input.away);
    if (input.home === "" || input.away === "" || !Number.isInteger(h) || !Number.isInteger(a)) return pick;
    if (h !== a) {
      if (pick === match.home_team || pick === match.away_team) return pick;
      return h > a ? match.home_team : match.away_team;
    }
    return pick;
  }

  async function markAsFinished(match: AdminMatch) {
    const input = getScoreInput(match);
    const homeScore = Number(input.home);
    const awayScore = Number(input.away);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      showToast(t("error"), "error");
      return;
    }

    let advancingPayload: { advancing_team: string | null } | Record<string, never> = {};
    if (isKnockoutPhase(match.phase)) {
      const adv = effectiveAdvancing(match, input).trim();
      if (!adv || (adv !== match.home_team && adv !== match.away_team)) {
        showToast(t("knockout.selectAdvancing"), "error");
        return;
      }
      advancingPayload = { advancing_team: adv };
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

    try {
      const { error } = await supabase
        .from("matches")
        .update({ home_score: homeScore, away_score: awayScore, status: "finished", ...advancingPayload })
        .eq("id", match.id);

      if (error) {
        showToast(t("error"), "error");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (token && supabaseUrl) {
        try {
          const scoreRes = await fetch(`${supabaseUrl}/functions/v1/score-match`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ match_id: match.id }),
          });

          if (!scoreRes.ok) {
            const errText = await scoreRes.text();
            console.error("score-match error:", errText);
            showToast(t("scoring.error"), "error");
          } else {
            let result: unknown = null;
            try {
              result = await scoreRes.json();
            } catch {
              /* non-JSON body */
            }
            console.log("score-match result:", result);
            if (isKnockoutPhase(match.phase)) {
              showToast(`${t("scoring.success")} — ${t("knockout.bracketUpdated")}`, "success");
            } else {
              showToast(t("scoring.success"), "success");
            }
          }
        } catch (err) {
          console.error("score-match fetch error:", err);
          showToast(t("scoring.error"), "error");
        }
      } else {
        console.error("score-match: missing session or NEXT_PUBLIC_SUPABASE_URL");
        showToast(t("scoring.error"), "error");
      }

      router.refresh();
    } finally {
      setIsSavingByMatch((prev) => ({ ...prev, [match.id]: false }));
    }
  }

  function openResolve(match: AdminMatch) {
    setResolveOpenFor(match.id);
    setResolveHome(match.home_team !== "TBD" ? match.home_team : "");
    setResolveAway(match.away_team !== "TBD" ? match.away_team : "");
  }

  async function submitResolve(match: AdminMatch) {
    const h = resolveHome.trim();
    const a = resolveAway.trim();
    if (!h || !a) {
      showToast(t("error"), "error");
      return;
    }
    setResolveSavingId(match.id);
    const { error } = await supabase.rpc("resolve_knockout_match", {
      p_match_id: match.id,
      p_home_team: h,
      p_away_team: a,
    });
    setResolveSavingId(null);
    if (error) {
      showToast(t("error"), "error");
      return;
    }
    showToast(t("knockout.resolved"), "success");
    setResolveOpenFor(null);
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

      {knockoutPhaseEntries.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-white">{t("knockout.sectionTitle")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("knockout.sectionHint")}</p>

          <div className="mt-3 space-y-4">
            {knockoutPhaseEntries.map(({ phase, items }) => {
              const allFinished = items.every((match) => match.status === "finished");
              const defaultOpen = activeKnockoutPhase ? phase === activeKnockoutPhase : !allFinished;

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
                      const needsTbd = match.home_team === "TBD" || match.away_team === "TBD";
                      const adv = effectiveAdvancing(match, input);
                      const hSc = Number(input.home);
                      const aSc = Number(input.away);
                      const isDraw =
                        input.home !== "" &&
                        input.away !== "" &&
                        Number.isInteger(hSc) &&
                        Number.isInteger(aSc) &&
                        hSc === aSc;

                      return (
                        <div key={match.id} className="rounded-lg border border-dark-600 bg-dark-800 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {match.knockout_label ?? "—"}
                              </p>
                              <p className="mt-1 font-medium text-white">
                                {match.home_team} vs {match.away_team}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {match.home_source ?? "—"} vs {match.away_source ?? "—"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">{formatWhen(match.match_time)}</p>
                              <span
                                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(match.status)}`}
                              >
                                {match.status === "finished"
                                  ? t("finished")
                                  : match.status === "live"
                                    ? t("live")
                                    : t("scheduled")}
                              </span>
                            </div>
                          </div>

                          {needsTbd && !isFinished ? (
                            <div className="mt-3 border-t border-dark-600 pt-3">
                              {resolveOpenFor === match.id ? (
                                <div className="flex flex-col gap-2">
                                  <label className="block text-xs text-slate-300">
                                    {t("knockout.homeTeam")}
                                    <select
                                      value={resolveHome}
                                      onChange={(e) => setResolveHome(e.target.value)}
                                      className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-sm text-white"
                                    >
                                      <option value="">{t("knockout.pickTeam")}</option>
                                      {TEAM_OPTIONS.map((name) => (
                                        <option key={name} value={name}>
                                          {name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="block text-xs text-slate-300">
                                    {t("knockout.awayTeam")}
                                    <select
                                      value={resolveAway}
                                      onChange={(e) => setResolveAway(e.target.value)}
                                      className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-sm text-white"
                                    >
                                      <option value="">{t("knockout.pickTeam")}</option>
                                      {TEAM_OPTIONS.map((name) => (
                                        <option key={name} value={name}>
                                          {name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={resolveSavingId === match.id}
                                      onClick={() => void submitResolve(match)}
                                      className={`rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                                    >
                                      {t("knockout.saveTeams")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setResolveOpenFor(null)}
                                      className="rounded-lg border border-dark-500 px-3 py-2 text-sm text-slate-300"
                                    >
                                      {t("cancel")}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openResolve(match)}
                                  className={`rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 ${PRIMARY_BUTTON_CLASSES}`}
                                >
                                  {t("knockout.resolveTeams")}
                                </button>
                              )}
                            </div>
                          ) : null}

                          {isFinished ? (
                            <p className="mt-3 text-base font-semibold text-emerald-400">
                              {match.home_score ?? 0} - {match.away_score ?? 0}
                              {match.advancing_team ? (
                                <span className="ml-2 block text-xs font-normal text-slate-400">
                                  {t("knockout.advancingTeam")}: {match.advancing_team}
                                </span>
                              ) : null}
                            </p>
                          ) : !needsTbd ? (
                            <div className="mt-3 flex flex-col gap-3 border-t border-dark-600 pt-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  value={input.home}
                                  onChange={(event) => setScore(match, "home", event.target.value)}
                                  className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  aria-label={t("homeScore")}
                                />
                                <span className="text-slate-500">-</span>
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  value={input.away}
                                  onChange={(event) => setScore(match, "away", event.target.value)}
                                  className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  aria-label={t("awayScore")}
                                />
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">{t("knockout.advancingTeam")}</p>
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAdvancingByMatchId((prev) => ({ ...prev, [match.id]: match.home_team }))
                                    }
                                    className={`min-h-[40px] flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                      adv === match.home_team
                                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-500/40"
                                        : "border-dark-500 bg-dark-900 text-slate-200 hover:border-emerald-500/40"
                                    }`}
                                  >
                                    {match.home_team}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAdvancingByMatchId((prev) => ({ ...prev, [match.id]: match.away_team }))
                                    }
                                    className={`min-h-[40px] flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                      adv === match.away_team
                                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-500/40"
                                        : "border-dark-500 bg-dark-900 text-slate-200 hover:border-emerald-500/40"
                                    }`}
                                  >
                                    {match.away_team}
                                  </button>
                                </div>
                                {isDraw ? (
                                  <p className="mt-1 text-[10px] text-amber-400/90">{t("knockout.drawPickAdvancing")}</p>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => void markAsFinished(match)}
                                className={`inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                              >
                                {isSaving ? t("scoring.calculating") : t("markFinished")}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-white">{t("matchResults")}</h2>

        <div className="mt-3 space-y-4">
          {groupPhaseEntries.map(({ phase, items }) => {
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
                          <span
                            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(match.status)}`}
                          >
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
                                onChange={(event) => setScore(match, "home", event.target.value)}
                                className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                aria-label={t("homeScore")}
                              />
                              <span className="text-slate-500">-</span>
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={input.away}
                                onChange={(event) => setScore(match, "away", event.target.value)}
                                className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                aria-label={t("awayScore")}
                              />
                            </div>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => void markAsFinished(match)}
                              className={`inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                            >
                              {isSaving ? t("scoring.calculating") : t("markFinished")}
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
