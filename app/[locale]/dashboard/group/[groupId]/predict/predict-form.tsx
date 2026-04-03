"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatMatchTime } from "@/lib/format-match-time";
import { formatGroupOddsCompactLine } from "@/lib/group-match-odds";
import { useEffectiveTimeZone } from "@/lib/use-effective-timezone";
import { getFlag, getGroup } from "@/lib/team-metadata";

type MatchRecord = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
  match_time: string;
  locked_at: string;
  status: string;
  home_win_odds: number | null;
  draw_odds: number | null;
  away_win_odds: number | null;
  ai_home_score: number | null;
  ai_away_score: number | null;
};

type PredictionRecord = {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
};

type Props = {
  matches: MatchRecord[];
  initialPredictions: PredictionRecord[];
  profileTimeZone: string | null;
};

type PredictionInput = {
  predictedHome: string;
  predictedAway: string;
  predictedWinner: "home" | "away" | "";
};

type PredictionPayload = {
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  predictedWinner: "home" | "away" | "draw" | null;
};

function getDayKey(matchTime: string) {
  return new Date(matchTime).toISOString().slice(0, 10);
}

function toPayload(match: MatchRecord, input: PredictionInput | undefined): PredictionPayload | null {
  if (!input || input.predictedHome === "" || input.predictedAway === "") return null;
  const predictedHome = Number(input.predictedHome);
  const predictedAway = Number(input.predictedAway);
  if (
    Number.isNaN(predictedHome) ||
    Number.isNaN(predictedAway) ||
    predictedHome < 0 ||
    predictedAway < 0
  ) {
    return null;
  }
  return {
    matchId: match.id,
    predictedHome,
    predictedAway,
    predictedWinner: match.phase !== "group" ? input.predictedWinner || null : null,
  };
}

export default function PredictForm({ matches, initialPredictions, profileTimeZone }: Props) {
  const locale = useLocale();
  const t = useTranslations("Predictions");
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [savedMatchIds, setSavedMatchIds] = useState(() => new Set(initialPredictions.map((p) => p.match_id)));

  useEffect(() => {
    setSavedMatchIds(new Set(initialPredictions.map((p) => p.match_id)));
  }, [initialPredictions]);

  const initialState = useMemo(() => {
    const map: Record<string, PredictionInput> = {};
    initialPredictions.forEach((prediction) => {
      map[prediction.match_id] = {
        predictedHome: prediction.predicted_home.toString(),
        predictedAway: prediction.predicted_away.toString(),
        predictedWinner:
          prediction.predicted_winner === "home" || prediction.predicted_winner === "away"
            ? prediction.predicted_winner
            : "",
      };
    });
    return map;
  }, [initialPredictions]);

  const [inputs, setInputs] = useState<Record<string, PredictionInput>>(initialState);

  useEffect(() => {
    setInputs((prev) => {
      const next = { ...initialState };
      for (const id of Object.keys(prev)) {
        if (next[id] === undefined) next[id] = prev[id]!;
      }
      return next;
    });
  }, [initialState]);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, MatchRecord[]> = {};
    matches.forEach((match) => {
      const key = getDayKey(match.match_time);
      groups[key] = groups[key] ?? [];
      groups[key].push(match);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  const groupStageMatches = useMemo(() => matches.filter((match) => match.phase === "group"), [matches]);
  const knockoutMatches = useMemo(() => matches.filter((match) => match.phase !== "group"), [matches]);

  const groupCards = useMemo(() => {
    const byLetter: Record<string, { letter: string; teams: string[]; matches: MatchRecord[] }> = {};
    groupStageMatches.forEach((match) => {
      const letter = getGroup(match.home_team);
      const entry = (byLetter[letter] ??= { letter, teams: [], matches: [] });
      entry.matches.push(match);
      if (!entry.teams.includes(match.home_team)) entry.teams.push(match.home_team);
      if (!entry.teams.includes(match.away_team)) entry.teams.push(match.away_team);
    });

    return Object.values(byLetter)
      .filter((entry) => entry.letter !== "?")
      .sort((a, b) => a.letter.localeCompare(b.letter))
      .map((entry) => {
        const predictedCount = entry.matches.filter((m) => savedMatchIds.has(m.id)).length;
        return { ...entry, predictedCount };
      });
  }, [groupStageMatches, savedMatchIds]);

  async function postPredictions(
    entries: PredictionPayload[],
    messageKey: "saved" | "messages.saveSuccess",
    options?: { bulkSpinner?: boolean }
  ) {
    if (entries.length === 0) return false;
    const bulkSpinner = options?.bulkSpinner !== false;
    setMessage(null);
    if (bulkSpinner) setIsSaving(true);
    try {
      const response = await fetch("./predict/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ predictions: entries }),
      });

      if (!response.ok) {
        setMessage({ type: "error", text: t("messages.saveError") });
        return false;
      }

      setSavedMatchIds((prev) => {
        const next = new Set(prev);
        entries.forEach((e) => next.add(e.matchId));
        return next;
      });
      setMessage({ type: "success", text: t(messageKey) });
      return true;
    } catch {
      setMessage({ type: "error", text: t("messages.saveError") });
      return false;
    } finally {
      if (bulkSpinner) setIsSaving(false);
    }
  }

  async function saveSingleMatch(match: MatchRecord) {
    const input = inputs[match.id];
    const payload = toPayload(match, input);
    if (!payload) return;
    setSavingMatchId(match.id);
    try {
      await postPredictions([payload], "saved", { bulkSpinner: false });
    } finally {
      setSavingMatchId(null);
    }
  }

  async function saveGroupAll(letter: string) {
    const entry = groupCards.find((g) => g.letter === letter);
    if (!entry) return;
    const nowDate = new Date();
    const payloads = entry.matches
      .filter((m) => new Date(m.locked_at) > nowDate)
      .map((m) => toPayload(m, inputs[m.id]))
      .filter((p): p is PredictionPayload => p !== null);
    await postPredictions(payloads, "saved");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nowDate = new Date();
    const payload = matches
      .filter((match) => new Date(match.locked_at) > nowDate)
      .map((match) => toPayload(match, inputs[match.id]))
      .filter((p): p is PredictionPayload => p !== null);

    await postPredictions(payload, "messages.saveSuccess");
  }

  function formatMatchWhen(match: MatchRecord) {
    return formatMatchTime(match.match_time, effectiveTz, locale);
  }

  const showGlobalSave =
    !expandedGroup && (knockoutMatches.length > 0 || (groupCards.length === 0 && groupedMatches.length > 0));

  if (matches.length === 0) {
    return <p className="mt-6 text-sm text-slate-400">{t("empty")}</p>;
  }

  return (
    <form className="mt-6 space-y-6" onSubmit={onSubmit}>
      {groupCards.length > 0 ? (
        expandedGroup ? (
          <section>
            <button
              type="button"
              onClick={() => setExpandedGroup(null)}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              ← {t("backToGroups")}
            </button>

            <div className="mt-4 space-y-6">
              {groupCards
                .find((g) => g.letter === expandedGroup)
                ?.matches.sort((a, b) => a.match_time.localeCompare(b.match_time))
                .map((match) => {
                  const lockPassed = new Date(match.locked_at) <= new Date();
                  const currentInput = inputs[match.id] ?? {
                    predictedHome: "",
                    predictedAway: "",
                    predictedWinner: "",
                  };
                  const saved = savedMatchIds.has(match.id);
                  const busy = savingMatchId === match.id;

                  return (
                    <div
                      key={match.id}
                      className="rounded-xl border border-dark-600 bg-dark-800 p-4"
                    >
                      <p className="text-right text-sm text-slate-400">{t("matchDate", { date: formatMatchWhen(match) })}</p>

                      <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
                        <span aria-hidden>{getFlag(match.home_team)}</span>
                        <span>{match.home_team}</span>
                      </div>
                      {lockPassed ? (
                        <p className="mt-2 flex min-h-[56px] items-center justify-center rounded-lg border border-dark-600 bg-dark-900 px-3 text-2xl font-semibold tabular-nums text-slate-200">
                          {currentInput.predictedHome || "—"}
                        </p>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="0"
                          value={currentInput.predictedHome}
                          onChange={(event) =>
                            setInputs((prev) => ({
                              ...prev,
                              [match.id]: { ...currentInput, predictedHome: event.target.value },
                            }))
                          }
                          className="mt-2 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 text-center text-2xl font-semibold tabular-nums text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      )}

                      <p className="my-4 text-center text-sm font-medium text-slate-500">{t("vs")}</p>

                      <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        <span aria-hidden>{getFlag(match.away_team)}</span>
                        <span>{match.away_team}</span>
                      </div>
                      {lockPassed ? (
                        <p className="mt-2 flex min-h-[56px] items-center justify-center rounded-lg border border-dark-600 bg-dark-900 px-3 text-2xl font-semibold tabular-nums text-slate-200">
                          {currentInput.predictedAway || "—"}
                        </p>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="0"
                          value={currentInput.predictedAway}
                          onChange={(event) =>
                            setInputs((prev) => ({
                              ...prev,
                              [match.id]: { ...currentInput, predictedAway: event.target.value },
                            }))
                          }
                          className="mt-2 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 text-center text-2xl font-semibold tabular-nums text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      )}

                      {match.home_win_odds != null &&
                      match.draw_odds != null &&
                      match.away_win_odds != null ? (
                        <div className="mt-4 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2.5 text-xs text-slate-300">
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            📊 {t("marketOdds")}
                          </p>
                          <div className="grid grid-cols-3 gap-1 text-center tabular-nums sm:gap-2">
                            <div>
                              <span className="mr-0.5" aria-hidden>
                                {getFlag(match.home_team)}
                              </span>
                              {Number(match.home_win_odds).toFixed(2)}
                            </div>
                            <div className="text-slate-400">
                              {t("draw")} {Number(match.draw_odds).toFixed(2)}
                            </div>
                            <div>
                              <span className="mr-0.5" aria-hidden>
                                {getFlag(match.away_team)}
                              </span>
                              {Number(match.away_win_odds).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {match.ai_home_score != null && match.ai_away_score != null ? (
                        <div className="mt-3 rounded-lg border border-indigo-800/40 bg-indigo-900/20 px-3 py-2.5 text-xs text-indigo-300">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-indigo-400">
                            🤖 {t("aiPrediction")}
                          </p>
                          <p className="text-sm">
                            🤖 {match.home_team} {match.ai_home_score} - {match.ai_away_score} {match.away_team}
                          </p>
                        </div>
                      ) : null}

                      {lockPassed ? (
                        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-400">
                          <span aria-hidden>🔒</span>
                          {t("locked")}
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || isSaving}
                          onClick={() => void saveSingleMatch(match)}
                          className="mt-4 w-full min-h-[48px] rounded-lg border border-emerald-600/50 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-900/50 disabled:opacity-60"
                        >
                          {busy ? t("saveSaving") : saved ? t("update") : t("save")}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={isSaving || savingMatchId !== null}
              onClick={() => void saveGroupAll(expandedGroup)}
              className="mt-6 w-full min-h-[48px] rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {isSaving ? t("saveSaving") : t("saveAll", { group: expandedGroup })}
            </button>
          </section>
        ) : (
          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {groupCards.map((group) => {
                const allPredicted = group.predictedCount >= 6;
                const partial = group.predictedCount > 0 && !allPredicted;
                const accent =
                  group.predictedCount === 0
                    ? "border-dark-600"
                    : allPredicted
                      ? "border-emerald-500/50"
                      : "border-amber-500/50";

                const ctaText = allPredicted
                  ? t("allPredicted")
                  : partial
                    ? t("continuePredicting")
                    : t("tapToPredict");

                const ctaClass = allPredicted
                  ? "text-emerald-400"
                  : partial
                    ? "text-amber-400"
                    : "text-emerald-400";

                const oddsLine = formatGroupOddsCompactLine(group.teams, group.matches);

                return (
                  <button
                    key={group.letter}
                    type="button"
                    onClick={() => setExpandedGroup(group.letter)}
                    className={`group/card cursor-pointer rounded-lg border ${accent} bg-dark-800 p-3 text-left transition hover:border-emerald-500/40 hover:bg-dark-700 active:scale-[0.98]`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-semibold text-white">
                        {t("groupLabel", { letter: group.letter })}
                      </p>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          allPredicted
                            ? "bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-700/50"
                            : group.predictedCount > 0
                              ? "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50"
                              : "bg-dark-700 text-slate-400 ring-1 ring-dark-500"
                        }`}
                      >
                        {group.predictedCount}/6
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {group.teams.slice(0, 4).map((team) => (
                        <li key={team}>
                          {getFlag(team)} {team}
                        </li>
                      ))}
                    </ul>
                    {oddsLine ? (
                      <p className="mt-1.5 truncate text-[10px] leading-tight text-slate-500" title={oddsLine}>
                        {oddsLine}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">{t("groupProgress", { count: group.predictedCount })}</p>
                    <div className="mt-3 flex items-end justify-between gap-2 border-t border-dark-600 pt-2">
                      <span className={`text-xs font-medium leading-snug ${ctaClass}`}>{ctaText}</span>
                      <span className="text-lg font-light text-emerald-400" aria-hidden>
                        ›
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("knockoutTitle")}</h2>
          <div className="mt-3 space-y-3">
            {knockoutMatches.map((match) => {
              const lockPassed = new Date(match.locked_at) <= new Date();
              const currentInput = inputs[match.id] ?? { predictedHome: "", predictedAway: "", predictedWinner: "" };

              return (
                <div key={match.id} className="rounded-lg border border-dark-600 bg-dark-800 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="text-xs text-slate-400">{formatMatchWhen(match)}</p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-slate-300">
                      {t("homeScore")}
                      <input
                        type="number"
                        min={0}
                        value={currentInput.predictedHome}
                        disabled={lockPassed}
                        onChange={(event) =>
                          setInputs((prev) => ({
                            ...prev,
                            [match.id]: { ...currentInput, predictedHome: event.target.value },
                          }))
                        }
                        className="mt-1 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-dark-700 disabled:text-slate-500"
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      {t("awayScore")}
                      <input
                        type="number"
                        min={0}
                        value={currentInput.predictedAway}
                        disabled={lockPassed}
                        onChange={(event) =>
                          setInputs((prev) => ({
                            ...prev,
                            [match.id]: { ...currentInput, predictedAway: event.target.value },
                          }))
                        }
                        className="mt-1 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-dark-700 disabled:text-slate-500"
                      />
                    </label>
                  </div>

                  {match.home_win_odds != null &&
                  match.draw_odds != null &&
                  match.away_win_odds != null ? (
                    <div className="mt-3 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-[11px] text-slate-300">
                      <p className="mb-1.5 font-medium uppercase tracking-wide text-slate-500">📊 {t("marketOdds")}</p>
                      <div className="grid grid-cols-3 gap-1 text-center tabular-nums">
                        <div>
                          <span className="mr-0.5" aria-hidden>
                            {getFlag(match.home_team)}
                          </span>
                          {Number(match.home_win_odds).toFixed(2)}
                        </div>
                        <div className="text-slate-400">
                          {t("draw")} {Number(match.draw_odds).toFixed(2)}
                        </div>
                        <div>
                          <span className="mr-0.5" aria-hidden>
                            {getFlag(match.away_team)}
                          </span>
                          {Number(match.away_win_odds).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {match.ai_home_score != null && match.ai_away_score != null ? (
                    <div className="mt-2 rounded-lg border border-indigo-800/40 bg-indigo-900/20 px-3 py-2 text-xs text-indigo-300">
                      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-indigo-400">
                        🤖 {t("aiPrediction")}
                      </p>
                      <p>
                        🤖 {match.home_team} {match.ai_home_score} - {match.ai_away_score} {match.away_team}
                      </p>
                    </div>
                  ) : null}

                  <label className="mt-3 block text-xs text-slate-300">
                    {t("advancesLabel")}
                    <select
                      value={currentInput.predictedWinner}
                      disabled={lockPassed}
                      onChange={(event) =>
                        setInputs((prev) => ({
                          ...prev,
                          [match.id]: { ...currentInput, predictedWinner: event.target.value as "home" | "away" | "" },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-dark-700 disabled:text-slate-500"
                    >
                      <option value="">{t("chooseTeam")}</option>
                      <option value="home">{match.home_team}</option>
                      <option value="away">{match.away_team}</option>
                    </select>
                  </label>

                  {lockPassed ? <p className="mt-3 text-xs font-medium text-amber-400/90">{t("lockedLabel")}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {groupCards.length === 0 &&
        knockoutMatches.length === 0 &&
        groupedMatches.map(([day, dayMatches]) => {
          const dayLabel = new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date(`${day}T00:00:00Z`));

          return (
            <section key={day}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dayLabel}</h2>
              <div className="mt-3 space-y-3">
                {dayMatches.map((match) => {
                  const lockPassed = new Date(match.locked_at) <= new Date();
                  const currentInput = inputs[match.id] ?? {
                    predictedHome: "",
                    predictedAway: "",
                    predictedWinner: "",
                  };

                  return (
                    <div key={match.id} className="rounded-lg border border-dark-600 bg-dark-800 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">
                          {match.home_team} vs {match.away_team}
                        </p>
                        <p className="text-xs text-slate-400">{formatMatchWhen(match)}</p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-slate-300">
                          {t("homeScore")}
                          <input
                            type="number"
                            min={0}
                            value={currentInput.predictedHome}
                            disabled={lockPassed}
                            onChange={(event) =>
                              setInputs((prev) => ({
                                ...prev,
                                [match.id]: { ...currentInput, predictedHome: event.target.value },
                              }))
                            }
                            className="mt-1 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-dark-700 disabled:text-slate-500"
                          />
                        </label>
                        <label className="text-xs text-slate-300">
                          {t("awayScore")}
                          <input
                            type="number"
                            min={0}
                            value={currentInput.predictedAway}
                            disabled={lockPassed}
                            onChange={(event) =>
                              setInputs((prev) => ({
                                ...prev,
                                [match.id]: { ...currentInput, predictedAway: event.target.value },
                              }))
                            }
                            className="mt-1 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-dark-700 disabled:text-slate-500"
                          />
                        </label>
                      </div>

                      {match.home_win_odds != null &&
                      match.draw_odds != null &&
                      match.away_win_odds != null ? (
                        <div className="mt-3 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-[11px] text-slate-300">
                          <p className="mb-1.5 font-medium uppercase tracking-wide text-slate-500">📊 {t("marketOdds")}</p>
                          <div className="grid grid-cols-3 gap-1 text-center tabular-nums">
                            <div>
                              <span className="mr-0.5" aria-hidden>
                                {getFlag(match.home_team)}
                              </span>
                              {Number(match.home_win_odds).toFixed(2)}
                            </div>
                            <div className="text-slate-400">
                              {t("draw")} {Number(match.draw_odds).toFixed(2)}
                            </div>
                            <div>
                              <span className="mr-0.5" aria-hidden>
                                {getFlag(match.away_team)}
                              </span>
                              {Number(match.away_win_odds).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {match.ai_home_score != null && match.ai_away_score != null ? (
                        <div className="mt-2 rounded-lg border border-indigo-800/40 bg-indigo-900/20 px-3 py-2 text-xs text-indigo-300">
                          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-indigo-400">
                            🤖 {t("aiPrediction")}
                          </p>
                          <p>
                            🤖 {match.home_team} {match.ai_home_score} - {match.ai_away_score} {match.away_team}
                          </p>
                        </div>
                      ) : null}

                      {match.phase !== "group" ? (
                        <label className="mt-3 block text-xs text-slate-300">
                          {t("advancesLabel")}
                          <select
                            value={currentInput.predictedWinner}
                            disabled={lockPassed}
                            onChange={(event) =>
                              setInputs((prev) => ({
                                ...prev,
                                [match.id]: {
                                  ...currentInput,
                                  predictedWinner: event.target.value as "home" | "away" | "",
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-dark-700 disabled:text-slate-500"
                          >
                            <option value="">{t("chooseTeam")}</option>
                            <option value="home">{match.home_team}</option>
                            <option value="away">{match.away_team}</option>
                          </select>
                        </label>
                      ) : null}

                      {lockPassed ? (
                        <p className="mt-3 text-xs font-medium text-amber-400/90">{t("lockedLabel")}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

      {message ? (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
      ) : null}

      {showGlobalSave ? (
        <button
          type="submit"
          disabled={isSaving}
          className="w-full min-h-[48px] rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isSaving ? t("saveSaving") : t("saveButton")}
        </button>
      ) : null}
    </form>
  );
}
