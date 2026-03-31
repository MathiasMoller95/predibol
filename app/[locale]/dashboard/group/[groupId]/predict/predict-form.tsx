"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFlag, getGroup } from "@/lib/team-metadata";

type MatchRecord = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
  match_time: string;
  locked_at: string;
  status: string;
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
};

type PredictionInput = {
  predictedHome: string;
  predictedAway: string;
  predictedWinner: "home" | "away" | "";
};

function getDayKey(matchTime: string) {
  return new Date(matchTime).toISOString().slice(0, 10);
}

export default function PredictForm({ matches, initialPredictions }: Props) {
  const locale = useLocale();
  const t = useTranslations("Predictions");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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
        const predictedMatchIds = new Set(initialPredictions.map((p) => p.match_id));
        const predictedCount = entry.matches.filter((m) => predictedMatchIds.has(m.id)).length;
        return { ...entry, predictedCount };
      });
  }, [groupStageMatches, initialPredictions]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const now = new Date();
    const payload = matches
      .filter((match) => new Date(match.locked_at) > now)
      .map((match) => {
        const input = inputs[match.id];
        if (!input || input.predictedHome === "" || input.predictedAway === "") {
          return null;
        }

        const predictedHome = Number(input.predictedHome);
        const predictedAway = Number(input.predictedAway);

        if (Number.isNaN(predictedHome) || Number.isNaN(predictedAway) || predictedHome < 0 || predictedAway < 0) {
          return null;
        }

        return {
          matchId: match.id,
          predictedHome,
          predictedAway,
          predictedWinner: match.phase !== "group" ? input.predictedWinner || null : null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    try {
      const response = await fetch("./predict/api", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ predictions: payload }),
      });

      if (!response.ok) {
        setMessage({ type: "error", text: t("messages.saveError") });
        setIsSaving(false);
        return;
      }

      setMessage({ type: "success", text: t("messages.saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("messages.saveError") });
    } finally {
      setIsSaving(false);
    }
  }

  if (matches.length === 0) {
    return <p className="mt-6 text-sm text-slate-600">{t("empty")}</p>;
  }

  return (
    <form className="mt-6 space-y-6" onSubmit={onSubmit}>
      {groupCards.length > 0 ? (
        expandedGroup ? (
          <section>
            <button
              type="button"
              onClick={() => setExpandedGroup(null)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← {t("backToGroups")}
            </button>
            <div className="mt-4 space-y-3">
              {groupCards
                .find((g) => g.letter === expandedGroup)
                ?.matches.sort((a, b) => a.match_time.localeCompare(b.match_time))
                .map((match) => {
                  const lockPassed = new Date(match.locked_at) <= new Date();
                  const currentInput = inputs[match.id] ?? { predictedHome: "", predictedAway: "", predictedWinner: "" };

                  return (
                    <div key={match.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">
                          {getFlag(match.home_team)} {match.home_team} vs {match.away_team} {getFlag(match.away_team)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {new Intl.DateTimeFormat(locale, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZoneName: "short",
                          }).format(new Date(match.match_time))}
                        </p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-slate-700">
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
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                          />
                        </label>
                        <label className="text-xs text-slate-700">
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
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                          />
                        </label>
                      </div>

                      {lockPassed ? <p className="mt-3 text-xs font-medium text-amber-700">{t("lockedLabel")}</p> : null}
                    </div>
                  );
                })}
            </div>
          </section>
        ) : (
          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {groupCards.map((group) => {
                const allPredicted = group.predictedCount >= 6;
                const accent =
                  group.predictedCount === 0
                    ? "border-slate-200"
                    : allPredicted
                      ? "border-emerald-200"
                      : "border-amber-200";

                return (
                  <button
                    key={group.letter}
                    type="button"
                    onClick={() => setExpandedGroup(group.letter)}
                    className={`rounded-lg border ${accent} bg-white p-3 text-left shadow-sm transition hover:bg-slate-50`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900">
                        {t("groupLabel", { letter: group.letter })}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          allPredicted ? "bg-emerald-100 text-emerald-800" : group.predictedCount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {group.predictedCount}/6
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-800">
                      {group.teams.slice(0, 4).map((team) => (
                        <li key={team}>
                          {getFlag(team)} {team}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-600">{t("groupProgress", { count: group.predictedCount })}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{t("knockoutTitle")}</h2>
          <div className="mt-3 space-y-3">
            {knockoutMatches.map((match) => {
              const lockPassed = new Date(match.locked_at) <= new Date();
              const currentInput = inputs[match.id] ?? { predictedHome: "", predictedAway: "", predictedWinner: "" };

              return (
                <div key={match.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Intl.DateTimeFormat(locale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZoneName: "short",
                      }).format(new Date(match.match_time))}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-slate-700">
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
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                      />
                    </label>
                    <label className="text-xs text-slate-700">
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
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block text-xs text-slate-700">
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
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                    >
                      <option value="">{t("chooseTeam")}</option>
                      <option value="home">{match.home_team}</option>
                      <option value="away">{match.away_team}</option>
                    </select>
                  </label>

                  {lockPassed ? <p className="mt-3 text-xs font-medium text-amber-700">{t("lockedLabel")}</p> : null}
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{dayLabel}</h2>
            <div className="mt-3 space-y-3">
              {dayMatches.map((match) => {
                const lockPassed = new Date(match.locked_at) <= new Date();
                const currentInput = inputs[match.id] ?? {
                  predictedHome: "",
                  predictedAway: "",
                  predictedWinner: "",
                };

                return (
                  <div key={match.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">
                        {match.home_team} vs {match.away_team}
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Intl.DateTimeFormat(locale, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZoneName: "short",
                        }).format(new Date(match.match_time))}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-slate-700">
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
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                        />
                      </label>
                      <label className="text-xs text-slate-700">
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
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                        />
                      </label>
                    </div>

                    {match.phase !== "group" ? (
                      <label className="mt-3 block text-xs text-slate-700">
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
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-emerald-200 focus:border-emerald-500 focus:ring-2 disabled:bg-slate-200"
                        >
                          <option value="">{t("chooseTeam")}</option>
                          <option value="home">{match.home_team}</option>
                          <option value="away">{match.away_team}</option>
                        </select>
                      </label>
                    ) : null}

                    {lockPassed ? (
                      <p className="mt-3 text-xs font-medium text-amber-700">{t("lockedLabel")}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {message ? (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isSaving ? t("saveSaving") : t("saveButton")}
      </button>
    </form>
  );
}
