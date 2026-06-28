"use client";

import { track } from "@vercel/analytics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { formatMatchTime } from "@/lib/format-match-time";
import { formatGroupOddsCompactLine } from "@/lib/group-match-odds";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { useEffectiveTimeZone } from "@/lib/use-effective-timezone";
import ProjectedGroupStandingsTable from "@/components/ProjectedGroupStandingsTable";
import SuperpowersHelpModal from "@/components/SuperpowersHelpModal";
import type { PredictionScores } from "@/lib/projected-standings";
import { getFlag, getGroup } from "@/lib/team-metadata";
import type { PowerType } from "@/lib/constants";
import type { CopyPredictionOption } from "@/components/CopyPredictionsBanner";
import CopyPredictionsBanner from "@/components/CopyPredictionsBanner";
import PredictionTabs from "@/components/PredictionTabs";
import { LiveMatchesSection, type LiveMatchRow } from "@/components/LiveMatchCard";
import ResultMatchCard from "@/components/ResultMatchCard";
import PointsPreview from "@/components/PointsPreview";
import WhoHasPredicted from "@/components/WhoHasPredicted";
import { Loader2, Lock, Save } from "lucide-react";
import type { GroupScoringRow } from "@/lib/match-points-client";
import { maxPossiblePoints } from "@/lib/match-points-client";
import { dayKeyInTz } from "@/lib/date-in-tz";
import { formatDurationMs } from "@/lib/format-duration-ms";

const SCORE_INPUT_KNOCKOUT_CLASS =
  "mt-1 min-h-[56px] w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-base text-white outline-none transition-colors duration-150 focus:border-gpri focus:ring-2 focus:ring-gpri/50 disabled:bg-dark-700 disabled:text-slate-500 placeholder:text-gray-600 placeholder:text-center";

/** Group-stage stacked row: 48×48 score inputs beside each team name. */
const STACKED_GROUP_SCORE_CLASS =
  "h-12 w-12 shrink-0 rounded-lg border border-white/10 bg-dark-900 text-center text-xl font-semibold tabular-nums text-white outline-none transition focus:border-gpri focus:ring-2 focus:ring-gpri/35 disabled:opacity-75 disabled:bg-dark-800 placeholder:text-gray-600";

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
  knockout_label: string | null;
  advancing_team?: string | null;
};

type PredictionRecord = {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  predicted_advancing: string | null;
};

const KNOCKOUT_PHASE_ORDER: string[] = [
  "round_of_16",
  "quarter_final",
  "quarter",
  "semi_final",
  "semi",
  "third_place",
  "final",
];

function isKnockoutPhase(phase: string) {
  return phase !== "group";
}

function isTeamsTbd(match: MatchRecord) {
  return match.home_team === "TBD" || match.away_team === "TBD";
}

function phaseOrderIndex(phase: string) {
  const i = KNOCKOUT_PHASE_ORDER.indexOf(phase);
  return i === -1 ? 999 : i;
}

/** Smallest ms until lock in the next 24h among `matchList`, or null if none qualifies. */
function lockCountdownMs(matchList: MatchRecord[]): number | null {
  const now = Date.now();
  let best: number | null = null;
  for (const m of matchList) {
    const t = new Date(m.locked_at).getTime();
    const ms = t - now;
    if (ms > 0 && ms <= 86400000) {
      if (best === null || ms < best) best = ms;
    }
  }
  return best;
}

type FinishedPickRow = MatchRecord & {
  home_score: number;
  away_score: number;
  advancing_team: string | null;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  predicted_advancing: string | null;
  points_earned: number;
};

export type GroupMember = { userId: string; displayName: string };
export type PowerUsageRow = { id: string; matchId: string; powerType: string; targetUserId: string | null };
export type PowerLimits = { doubleDown: number; spy: number; shield: number };
export type SpyResult = { home: number; away: number } | null;

type Props = {
  upcomingMatches: MatchRecord[];
  liveMatches: LiveMatchRow[];
  finishedMatches: FinishedPickRow[];
  groupScoring: GroupScoringRow;
  stickersByMatch: Record<string, { team: string; tier: string }[]>;
  predictionLookup: Record<
    string,
    {
      predicted_home: number;
      predicted_away: number;
      predicted_winner: "home" | "away" | "draw" | null;
      predicted_advancing: string | null;
      points_earned?: number | null;
    }
  >;
  initialPredictions: PredictionRecord[];
  profileTimeZone: string | null;
  groupMembers: GroupMember[];
  powerUsage: PowerUsageRow[];
  powerLimits: PowerLimits;
  predictionsByMatch: Record<string, string[]>;
  currentUserId: string;
  copyPredictionOptions: CopyPredictionOption[];
  copyPredictionTargetGroupId: string;
  /** Earliest globally scheduled future match (cross-group), for Results empty state. */
  firstKickoffMatch?: MatchRecord | null;
};

type PredictionInput = {
  predictedHome: string;
  predictedAway: string;
  predictedWinner: "home" | "away" | "";
  predictedAdvancing: string;
};

const emptyPredictionInput: PredictionInput = {
  predictedHome: "",
  predictedAway: "",
  predictedWinner: "",
  predictedAdvancing: "",
};

function patchPredictionInput(cur: PredictionInput, patch: Partial<PredictionInput>): PredictionInput {
  const next = { ...cur, ...patch };
  const nh = Number(next.predictedHome);
  const na = Number(next.predictedAway);
  if (
    next.predictedHome !== "" &&
    next.predictedAway !== "" &&
    !Number.isNaN(nh) &&
    !Number.isNaN(na)
  ) {
    if (nh !== na) {
      next.predictedAdvancing = "";
    } else {
      next.predictedWinner = "";
    }
  }
  return next;
}

type PredictionPayload = {
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  predictedWinner: "home" | "away" | "draw" | null;
  predictedAdvancing: string | null;
};

function getDayKey(matchTime: string) {
  return new Date(matchTime).toISOString().slice(0, 10);
}

function toPayload(match: MatchRecord, input: PredictionInput | undefined): PredictionPayload | null {
  if (!input || input.predictedHome === "" || input.predictedAway === "") return null;
  if (isTeamsTbd(match)) return null;
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
  const predictedWinner: "home" | "away" | "draw" | null = null;
  const predictedAdvancing: string | null = null;
  return {
    matchId: match.id,
    predictedHome,
    predictedAway,
    predictedWinner,
    predictedAdvancing,
  };
}

function validateKnockoutDraw(): boolean {
  return false;
}

function validateKnockoutNeedsWinner(): boolean {
  return false;
}

export default function PredictForm({
  upcomingMatches,
  liveMatches,
  finishedMatches,
  groupScoring,
  stickersByMatch,
  predictionLookup,
  initialPredictions,
  profileTimeZone,
  groupMembers,
  powerUsage,
  powerLimits,
  predictionsByMatch,
  currentUserId,
  copyPredictionOptions,
  copyPredictionTargetGroupId,
  firstKickoffMatch = null,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("Predictions");
  const tp = useTranslations("Powers");
  const { showToast } = useToast();
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);
  const resultsKickoffDays = useMemo(() => {
    if (!firstKickoffMatch?.match_time) return null;
    const ms = new Date(firstKickoffMatch.match_time).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }, [firstKickoffMatch?.match_time]);

  const [isSaving, setIsSaving] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [savedMatchIds, setSavedMatchIds] = useState(() => new Set(initialPredictions.map((p) => p.match_id)));
  const [pointsPreviewForMatch, setPointsPreviewForMatch] = useState<Record<string, boolean>>({});

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
        predictedAdvancing: prediction.predicted_advancing?.trim() ?? "",
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

  // ─── Superpowers state ───
  const [activePowers, setActivePowers] = useState<Record<string, Set<PowerType>>>(() => {
    const map: Record<string, Set<PowerType>> = {};
    for (const pu of powerUsage) {
      (map[pu.matchId] ??= new Set()).add(pu.powerType as PowerType);
    }
    return map;
  });
  const [spyTargets, setSpyTargets] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const pu of powerUsage) {
      if (pu.powerType === "spy" && pu.targetUserId) map[pu.matchId] = pu.targetUserId;
    }
    return map;
  });
  const [spyResults, setSpyResults] = useState<Record<string, { home: number; away: number; shielded: boolean } | null>>({});
  const [spyModalMatchId, setSpyModalMatchId] = useState<string | null>(null);
  const [powerBusy, setPowerBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!spyModalMatchId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [spyModalMatchId]);

  const usedCounts = useMemo(() => {
    const c = { double_down: 0, spy: 0, shield: 0 };
    for (const set of Object.values(activePowers)) {
      Array.from(set).forEach((pt) => { c[pt]++; });
    }
    return c;
  }, [activePowers]);

  const remaining = useMemo(
    () => ({
      double_down: powerLimits.doubleDown - usedCounts.double_down,
      spy: powerLimits.spy - usedCounts.spy,
      shield: powerLimits.shield - usedCounts.shield,
    }),
    [powerLimits, usedCounts],
  );

  const fetchSpyResult = useCallback(
    async (matchId: string, targetUserId: string) => {
      try {
        const res = await fetch(`./predict/spy?matchId=${matchId}&targetUserId=${targetUserId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.shielded) {
          setSpyResults((p) => ({ ...p, [matchId]: { home: 0, away: 0, shielded: true } }));
        } else if (data.prediction) {
          setSpyResults((p) => ({ ...p, [matchId]: { home: data.prediction.home, away: data.prediction.away, shielded: false } }));
        } else {
          setSpyResults((p) => ({ ...p, [matchId]: null }));
        }
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const togglePower = useCallback(
    async (matchId: string, pt: PowerType, targetUserId?: string) => {
      const key = `${matchId}-${pt}`;
      if (powerBusy[key]) return;
      setPowerBusy((p) => ({ ...p, [key]: true }));
      try {
        const isActive = activePowers[matchId]?.has(pt);
        if (isActive) {
          const res = await fetch("./predict/powers", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId, powerType: pt }),
          });
          if (!res.ok) {
            showToast(tp("error"), "error");
            return;
          }
          setActivePowers((prev) => {
            const next = { ...prev };
            const s = new Set(next[matchId]);
            s.delete(pt);
            next[matchId] = s;
            return next;
          });
          if (pt === "spy") {
            setSpyTargets((p) => { const n = { ...p }; delete n[matchId]; return n; });
            setSpyResults((p) => { const n = { ...p }; delete n[matchId]; return n; });
          }
          showToast(tp(`${pt === "double_down" ? "doubleDown" : pt}.deactivated`), "success");
        } else {
          if (pt === "spy" && !targetUserId) {
            setSpyModalMatchId(matchId);
            return;
          }
          const res = await fetch("./predict/powers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId, powerType: pt, targetUserId: targetUserId ?? null }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast(data.error === "Limit reached" ? tp("noUsesLeft") : tp("error"), "error");
            return;
          }
          setActivePowers((prev) => {
            const next = { ...prev };
            const s = new Set(next[matchId] ?? []);
            s.add(pt);
            next[matchId] = s;
            return next;
          });
          if (pt === "spy" && targetUserId) {
            setSpyTargets((p) => ({ ...p, [matchId]: targetUserId }));
            fetchSpyResult(matchId, targetUserId);
          }
          track("power_used", { groupId: copyPredictionTargetGroupId, powerType: pt });
          const toastKey = pt === "double_down" ? "doubleDown" : pt;
          showToast(tp(`${toastKey}.activated`), "success");
        }
      } finally {
        setPowerBusy((p) => ({ ...p, [key]: false }));
      }
    },
    [activePowers, copyPredictionTargetGroupId, powerBusy, showToast, tp, fetchSpyResult],
  );

  useEffect(() => {
    for (const [matchId, targetId] of Object.entries(spyTargets)) {
      if (!spyResults[matchId] && spyResults[matchId] !== null) {
        fetchSpyResult(matchId, targetId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, MatchRecord[]> = {};
    upcomingMatches.forEach((match) => {
      const key = getDayKey(match.match_time);
      groups[key] = groups[key] ?? [];
      groups[key].push(match);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingMatches]);

  const groupStageMatches = useMemo(
    () => upcomingMatches.filter((match) => match.phase === "group"),
    [upcomingMatches],
  );

  const mergedGroupPredictionScores = useMemo((): PredictionScores => {
    const preds: PredictionScores = {};
    for (const m of groupStageMatches) {
      const inp = inputs[m.id];
      if (!inp || inp.predictedHome === "" || inp.predictedAway === "") continue;
      const h = Number(inp.predictedHome);
      const a = Number(inp.predictedAway);
      if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) continue;
      preds[m.id] = { home: h, away: a };
    }
    return preds;
  }, [groupStageMatches, inputs]);
  const knockoutMatches = useMemo(
    () => upcomingMatches.filter((match) => match.phase !== "group"),
    [upcomingMatches],
  );
  const knockoutByPhase = useMemo(() => {
    const map = new Map<string, MatchRecord[]>();
    knockoutMatches.forEach((m) => {
      const list = map.get(m.phase) ?? [];
      list.push(m);
      map.set(m.phase, list);
    });
    return Array.from(map.entries()).sort((a, b) => phaseOrderIndex(a[0]) - phaseOrderIndex(b[0]));
  }, [knockoutMatches]);

  const todayMatchDayKey = useMemo(
    () => dayKeyInTz(new Date().toISOString(), effectiveTz),
    [effectiveTz],
  );

  const groupCards = useMemo(() => {
    const byLetter: Record<string, { letter: string; teams: string[]; matches: MatchRecord[] }> = {};
    groupStageMatches.forEach((match) => {
      const letter = getGroup(match.home_team);
      const entry = (byLetter[letter] ??= { letter, teams: [], matches: [] });
      entry.matches.push(match);
      if (!entry.teams.includes(match.home_team)) entry.teams.push(match.home_team);
      if (!entry.teams.includes(match.away_team)) entry.teams.push(match.away_team);
    });

    const todayKey = dayKeyInTz(new Date().toISOString(), effectiveTz);
    const tomorrowKey = dayKeyInTz(new Date(Date.now() + 86400000).toISOString(), effectiveTz);

    type Card = {
      letter: string;
      teams: string[];
      matches: MatchRecord[];
      predictedCount: number;
      total: number;
      allDone: boolean;
      dateBanner: "today" | "tomorrow" | "none";
      lockSoonMs: number | null;
    };

    const cards: Card[] = Object.values(byLetter)
      .filter((entry) => entry.letter !== "?")
      .map((entry) => {
        const sortedMatches = [...entry.matches].sort((a, b) =>
          a.match_time.localeCompare(b.match_time),
        );
        const predictedCount = sortedMatches.filter((m) => savedMatchIds.has(m.id)).length;
        const total = sortedMatches.length;
        const allDone = total > 0 && predictedCount >= total;
        const matchDayKeys = sortedMatches.map((m) => dayKeyInTz(m.match_time, effectiveTz));
        const hasToday = matchDayKeys.some((k) => k === todayKey);
        const hasTomorrow = matchDayKeys.some((k) => k === tomorrowKey);
        let dateBanner: "today" | "tomorrow" | "none" = "none";
        if (hasToday) dateBanner = "today";
        else if (hasTomorrow) dateBanner = "tomorrow";
        const lockSoonMs = lockCountdownMs(sortedMatches);
        return {
          letter: entry.letter,
          teams: entry.teams,
          matches: sortedMatches,
          predictedCount,
          total,
          allDone,
          dateBanner,
          lockSoonMs,
        };
      });

    return cards.sort((a, b) => {
      const tier = (c: Card) =>
        c.dateBanner === "today" ? 0 : c.dateBanner === "tomorrow" ? 1 : 2;
      const ta = tier(a);
      const tb = tier(b);
      if (ta !== tb) return ta - tb;
      if (a.allDone !== b.allDone) return a.allDone ? 1 : -1;
      if (a.predictedCount !== b.predictedCount) return a.predictedCount - b.predictedCount;
      return a.letter.localeCompare(b.letter);
    });
  }, [groupStageMatches, savedMatchIds, effectiveTz]);

  const groupLettersAlphabetical = useMemo(
    () => [...groupCards.map((g) => g.letter)].sort((a, b) => a.localeCompare(b)),
    [groupCards],
  );

  async function postPredictions(
    entries: PredictionPayload[],
    messageKey: "saved" | "messages.saveSuccess",
    options?: { bulkSpinner?: boolean }
  ) {
    if (entries.length === 0) return false;
    const bulkSpinner = options?.bulkSpinner !== false;
    if (bulkSpinner) setIsSaving(true);
    try {
      const response = await fetch("./predict/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ predictions: entries }),
      });

      if (!response.ok) {
        showToast(t("messages.saveError"), "error");
        return false;
      }

      for (const e of entries) {
        track("prediction_saved", { groupId: copyPredictionTargetGroupId, matchId: e.matchId });
      }

      setSavedMatchIds((prev) => {
        const next = new Set(prev);
        entries.forEach((e) => next.add(e.matchId));
        return next;
      });
      setPointsPreviewForMatch((prev) => {
        const next = { ...prev };
        for (const e of entries) next[e.matchId] = true;
        return next;
      });
      showToast(t(messageKey), "success");
      return true;
    } catch {
      showToast(t("messages.saveError"), "error");
      return false;
    } finally {
      if (bulkSpinner) setIsSaving(false);
    }
  }

  async function saveSingleMatch(match: MatchRecord) {
    const input = inputs[match.id];
    if (validateKnockoutDraw(match, input)) {
      showToast(t("selectAdvances"), "error");
      return;
    }
    if (validateKnockoutNeedsWinner(match, input)) {
      showToast(t("selectWinnerIfNotDraw"), "error");
      return;
    }
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
    const due = upcomingMatches.filter((match) => new Date(match.locked_at) > nowDate);
    for (const match of due) {
      if (validateKnockoutDraw(match, inputs[match.id])) {
        showToast(t("selectAdvances"), "error");
        return;
      }
      if (validateKnockoutNeedsWinner(match, inputs[match.id])) {
        showToast(t("selectWinnerIfNotDraw"), "error");
        return;
      }
    }
    const payload = due
      .map((match) => toPayload(match, inputs[match.id]))
      .filter((p): p is PredictionPayload => p !== null);

    await postPredictions(payload, "messages.saveSuccess");
  }

  function formatMatchWhen(match: MatchRecord) {
    return formatMatchTime(match.match_time, effectiveTz, locale);
  }

  const showGlobalSave =
    !expandedGroup && (knockoutMatches.length > 0 || (groupCards.length === 0 && groupedMatches.length > 0));

  const doubleDownMatchIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of powerUsage) {
      if (p.powerType === "double_down") s.add(p.matchId);
    }
    return s;
  }, [powerUsage]);

  const utterlyEmpty =
    upcomingMatches.length === 0 &&
    liveMatches.length === 0 &&
    finishedMatches.length === 0;

  if (utterlyEmpty) {
    return (
      <div className="mt-2">
        <p className="text-sm text-slate-400">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <PredictionTabs
        showLiveTab={liveMatches.length > 0}
        upcomingContent={
          <>
            {copyPredictionOptions.length > 0 ? (
              <CopyPredictionsBanner
                targetGroupId={copyPredictionTargetGroupId}
                options={copyPredictionOptions}
              />
            ) : null}
            {upcomingMatches.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("noUpcoming")}</p>
            ) : (
              <form className="mt-4 space-y-6" onSubmit={onSubmit}>
      {groupCards.length > 0 ? (
        expandedGroup ? (
          <div key={`expand-${expandedGroup}`} className="animate-page-in">
            <section>
              <button
                type="button"
                onClick={() => setExpandedGroup(null)}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white active:scale-[0.97]"
              >
                {t("collapse")}
              </button>

              <div className="mt-4 space-y-2">
                {groupCards
                  .find((g) => g.letter === expandedGroup)
                  ?.matches.map((match) => {
                    const lockPassed = new Date(match.locked_at) <= new Date();
                    const currentInput = inputs[match.id] ?? { ...emptyPredictionInput };
                    const busy = savingMatchId === match.id;
                    const matchPowers = activePowers[match.id];
                    const hasDD = !!matchPowers?.has("double_down");
                    const locksMsOne = lockCountdownMs([match]);
                    const lockSoonLabel =
                      locksMsOne != null ? formatDurationMs(locksMsOne) : null;
                    const isToday =
                      dayKeyInTz(match.match_time, effectiveTz) === todayMatchDayKey;

                    return (
                      <CompactGroupPredictionRow
                        key={match.id}
                        match={match}
                        lockPassed={lockPassed}
                        saved={savedMatchIds.has(match.id)}
                        busy={busy}
                        isSaving={isSaving}
                        isToday={isToday}
                        currentInput={currentInput}
                        onPatchInput={(patch) =>
                          setInputs((prev) => ({
                            ...prev,
                            [match.id]: { ...(prev[match.id] ?? emptyPredictionInput), ...patch },
                          }))
                        }
                        formatMatchWhen={formatMatchWhen}
                        lockSoonLabel={lockSoonLabel}
                        activePowers={activePowers[match.id]}
                        remaining={remaining}
                        powerBusy={powerBusy}
                        togglePower={togglePower}
                        tp={tp}
                        limits={powerLimits}
                        predictionsByMember={predictionsByMatch[match.id] ?? []}
                        groupMembers={groupMembers}
                        currentUserId={currentUserId}
                        spyTargetDisplayName={
                          spyTargets[match.id]
                            ? groupMembers.find((m) => m.userId === spyTargets[match.id])?.displayName ?? null
                            : null
                        }
                        spyResult={spyResults[match.id]}
                        onSave={() => void saveSingleMatch(match)}
                        pointsPreviewVisible={!!pointsPreviewForMatch[match.id]}
                        onDismissPreview={() =>
                          setPointsPreviewForMatch((p) => {
                            const next = { ...p };
                            delete next[match.id];
                            return next;
                          })
                        }
                        previewPoints={maxPossiblePoints(groupScoring, hasDD)}
                        t={t}
                      />
                    );
                  })}
              </div>

              <ProjectedGroupStandingsTable
                groupLetter={expandedGroup}
                groupStageMatches={groupStageMatches}
                predictionScores={mergedGroupPredictionScores}
              />

              <button
                type="button"
                disabled={isSaving || savingMatchId !== null}
                onClick={() => void saveGroupAll(expandedGroup)}
                className={`mt-6 w-full min-h-[48px] rounded-lg bg-gpri px-4 py-3 text-base font-semibold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gpri/50 ${PRIMARY_BUTTON_CLASSES}`}
              >
                {isSaving ? t("saveSaving") : t("saveAll", { group: expandedGroup })}
              </button>

              {(() => {
                const currentLetterIndex = groupLettersAlphabetical.indexOf(expandedGroup);
                const nextLetter =
                  currentLetterIndex !== -1 ? groupLettersAlphabetical[currentLetterIndex + 1] : undefined;
                if (!nextLetter) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedGroup(nextLetter);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 w-full min-h-[48px] rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-base font-semibold text-white hover:bg-dark-600"
                  >
                    {t("nextGroup", { group: nextLetter })}
                  </button>
                );
              })()}
            </section>
          </div>
        ) : (
          <div key="group-grid" className="animate-page-in">
            <section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {groupCards.map((group, cardIndex) => {
                  const allPredicted = group.allDone;
                  const partial = group.predictedCount > 0 && !allPredicted;
                  const accent =
                    group.predictedCount === 0
                      ? "border-dark-600"
                      : allPredicted
                        ? "border-gpri/50"
                        : "border-amber-500/50";

                  const ctaText = allPredicted
                    ? t("allPredicted")
                    : partial
                      ? t("continuePredicting")
                      : t("tapToPredict");

                  const ctaClass = allPredicted
                    ? "text-gpri"
                    : partial
                      ? "text-amber-400"
                      : "text-gpri";

                  const oddsLine = formatGroupOddsCompactLine(group.teams, group.matches);
                  const dateBadge =
                    group.dateBanner === "today" ? (
                      <span className="animate-pulse rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400 ring-1 ring-red-500/40">
                        {t("badges.today")}
                      </span>
                    ) : group.dateBanner === "tomorrow" ? (
                      <span className="rounded-full bg-slate-700/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-slate-600">
                        {t("badges.tomorrow")}
                      </span>
                    ) : null;

                  return (
                    <button
                      key={group.letter}
                      type="button"
                      onClick={() => setExpandedGroup(group.letter)}
                      style={{ animationDelay: `${Math.min(cardIndex * 80, 500)}ms` }}
                      className={`group/card animate-page-in cursor-pointer rounded-lg border ${accent} bg-dark-800 ${allPredicted ? "p-2.5" : "p-3"} text-left transition-all duration-200 hover:border-gpri/40 hover:bg-dark-700 active:scale-[0.98]`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <p className="text-base font-semibold text-white">
                            {t("groupLabel", { letter: group.letter })}
                          </p>
                          {dateBadge}
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            allPredicted
                              ? "bg-gpri/15 text-gsec ring-1 ring-gpri/40"
                              : group.predictedCount > 0
                                ? "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50"
                                : "bg-dark-700 text-slate-400 ring-1 ring-dark-500"
                          }`}
                        >
                          {group.predictedCount}/{group.total}
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
                      {group.lockSoonMs != null ? (
                        <p className="mt-1 text-[11px] text-amber-400/90">
                          {t("locksIn", { time: formatDurationMs(group.lockSoonMs) })}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-400">
                        {t("groupProgress", { count: group.predictedCount, total: group.total })}
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-2 border-t border-dark-600 pt-2">
                        <span className={`text-xs font-medium leading-snug ${ctaClass}`}>{ctaText}</span>
                        <span className="text-lg font-light text-gpri" aria-hidden>
                          ›
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section className="mt-2 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("knockoutTitle")}</h2>
          <div className="space-y-3">
            {knockoutByPhase.map(([phase, phaseMatches]) => (
              <details
                key={phase}
                open
                className="rounded-xl border border-dark-600 bg-dark-800/80 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white transition hover:bg-dark-700/50">
                  {(t as (key: string) => string)(`phase.${phase}`)}
                </summary>
                <div className="space-y-3 border-t border-dark-600 px-3 py-3">
                  {phaseMatches
                    .sort((a, b) => a.match_time.localeCompare(b.match_time))
                    .map((match) => {
                      const lockPassed = new Date(match.locked_at) <= new Date();
                      const currentInput = inputs[match.id] ?? { ...emptyPredictionInput };
                      const tbd = isTeamsTbd(match);

                      const kMatchPowers = activePowers[match.id];
                      const kHasDD = kMatchPowers?.has("double_down");
                      const kHasShield = kMatchPowers?.has("shield");
                      const kCardBorder = kHasDD
                        ? "border-l-4 border-amber-500 shadow-[inset_0_0_12px_rgba(245,158,11,0.08)]"
                        : kHasShield
                          ? "border-l-4 border-gpri"
                          : "border border-dark-600";

                      return (
                        <div key={match.id} className={`rounded-lg bg-dark-800 p-3 ${kCardBorder}`}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">
                              {match.home_team} vs {match.away_team}
                            </p>
                            <p className="text-xs text-slate-400">{formatMatchWhen(match)}</p>
                          </div>

                          {tbd ? (
                            <p className="mt-4 text-sm text-slate-400">{t("teamsTbd")}</p>
                          ) : (
                            <>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="text-xs text-slate-300">
                                  {t("homeScore", {
                                    team: `${getFlag(match.home_team)} ${match.home_team}`,
                                  })}
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="-"
                                    value={currentInput.predictedHome}
                                    disabled={lockPassed}
                                    onChange={(event) =>
                                      setInputs((prev) => ({
                                        ...prev,
                                        [match.id]: patchPredictionInput(
                                          prev[match.id] ?? { ...emptyPredictionInput },
                                          { predictedHome: event.target.value },
                                        ),
                                      }))
                                    }
                                    className={SCORE_INPUT_KNOCKOUT_CLASS}
                                  />
                                </label>
                                <label className="text-xs text-slate-300">
                                  {t("awayScore", {
                                    team: `${getFlag(match.away_team)} ${match.away_team}`,
                                  })}
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="-"
                                    value={currentInput.predictedAway}
                                    disabled={lockPassed}
                                    onChange={(event) =>
                                      setInputs((prev) => ({
                                        ...prev,
                                        [match.id]: patchPredictionInput(
                                          prev[match.id] ?? { ...emptyPredictionInput },
                                          { predictedAway: event.target.value },
                                        ),
                                      }))
                                    }
                                    className={SCORE_INPUT_KNOCKOUT_CLASS}
                                  />
                                </label>
                              </div>

                              {match.home_win_odds != null &&
                              match.draw_odds != null &&
                              match.away_win_odds != null ? (
                                <div className="mt-3 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-[11px] text-slate-300">
                                  <p className="mb-1.5 font-medium uppercase tracking-wide text-slate-500">
                                    📊 {t("marketOdds")}
                                  </p>
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
                                    🤖 {match.home_team} {match.ai_home_score} - {match.ai_away_score}{" "}
                                    {match.away_team}
                                  </p>
                                </div>
                              ) : null}

                              {!lockPassed && (
                                <PowerPanel
                                  matchId={match.id}
                                  activePowers={activePowers[match.id]}
                                  remaining={remaining}
                                  busy={powerBusy}
                                  onToggle={togglePower}
                                  tp={tp}
                                  limits={powerLimits}
                                />
                              )}
                              {activePowers[match.id]?.has("spy") && spyTargets[match.id] && (
                                <SpyResultCard
                                  matchId={match.id}
                                  targetName={groupMembers.find((m) => m.userId === spyTargets[match.id])?.displayName ?? "?"}
                                  result={spyResults[match.id]}
                                  tp={tp}
                                />
                              )}
                              <WhoHasPredicted
                                matchId={match.id}
                                groupMembers={groupMembers}
                                predicted={predictionsByMatch[match.id] ?? []}
                                currentUserId={currentUserId}
                                tp={tp}
                              />

                              {!lockPassed && (
                                <p className="mt-3 text-xs text-slate-400">{t("knockoutScoreHint")}</p>
                              )}
                            </>
                          )}

                          {lockPassed ? (
                            <p className="mt-3 text-xs font-medium text-amber-400/90">{t("lockedLabel")}</p>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </details>
            ))}
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
                  const currentInput = inputs[match.id] ?? { ...emptyPredictionInput };
                  const ko = isKnockoutPhase(match.phase);
                  const tbd = isTeamsTbd(match);

                  return (
                    <div key={match.id} className="rounded-lg border border-dark-600 bg-dark-800 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">
                          {match.home_team} vs {match.away_team}
                        </p>
                        <p className="text-xs text-slate-400">{formatMatchWhen(match)}</p>
                      </div>

                      {ko && tbd ? (
                        <p className="mt-4 text-sm text-slate-400">{t("teamsTbd")}</p>
                      ) : (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs text-slate-300">
                            {t("homeScore", {
                              team: `${getFlag(match.home_team)} ${match.home_team}`,
                            })}
                            <input
                              type="number"
                              min={0}
                              placeholder="-"
                              value={currentInput.predictedHome}
                              disabled={lockPassed}
                              onChange={(event) =>
                                setInputs((prev) => ({
                                  ...prev,
                                  [match.id]: patchPredictionInput(
                                    prev[match.id] ?? { ...emptyPredictionInput },
                                    { predictedHome: event.target.value },
                                  ),
                                }))
                              }
                              className={SCORE_INPUT_KNOCKOUT_CLASS}
                            />
                          </label>
                          <label className="text-xs text-slate-300">
                            {t("awayScore", {
                              team: `${getFlag(match.away_team)} ${match.away_team}`,
                            })}
                            <input
                              type="number"
                              min={0}
                              placeholder="-"
                              value={currentInput.predictedAway}
                              disabled={lockPassed}
                              onChange={(event) =>
                                setInputs((prev) => ({
                                  ...prev,
                                  [match.id]: patchPredictionInput(
                                    prev[match.id] ?? { ...emptyPredictionInput },
                                    { predictedAway: event.target.value },
                                  ),
                                }))
                              }
                              className={SCORE_INPUT_KNOCKOUT_CLASS}
                            />
                          </label>
                        </div>
                      )}

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

                      {ko && !tbd && !lockPassed ? (
                        <p className="mt-3 text-xs text-slate-400">{t("knockoutScoreHint")}</p>
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

      {showGlobalSave ? (
        <button
          type="submit"
          disabled={isSaving}
          className={`w-full min-h-[48px] rounded-lg bg-gpri px-4 py-3 text-base font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gpri/50 ${PRIMARY_BUTTON_CLASSES}`}
        >
          {isSaving ? t("saveSaving") : t("saveButton")}
        </button>
      ) : null}
    </form>
            )}
          </>
        }
        liveContent={
          <LiveMatchesSection
            initialMatches={liveMatches}
            groupScoring={groupScoring}
            predictionLookup={
              predictionLookup as Record<
                string,
                | {
                    predicted_home: number;
                    predicted_away: number;
                    predicted_winner: "home" | "away" | "draw" | null;
                    predicted_advancing: string | null;
                  }
                | undefined
              >
            }
            powerActiveByMatch={activePowers}
            predictionsByMatch={predictionsByMatch}
            groupMembers={groupMembers}
            currentUserId={currentUserId}
          />
        }
        resultsContent={
          <div className="space-y-4 pt-2">
            {finishedMatches.length === 0 ? (
              <div className="relative isolate min-h-[220px] overflow-hidden rounded-xl border border-white/[0.08] bg-dark-900/50 px-5 py-10 text-center">
                <svg
                  className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.05]"
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
                  <circle cx="60" cy="60" r="6" fill="currentColor" opacity="0.35" />
                </svg>
                <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-3">
                  <p className="text-sm leading-relaxed text-slate-400">{t("resultsTab.emptyState.lead")}</p>
                  {firstKickoffMatch && resultsKickoffDays != null ? (
                    <div className="mt-1 w-full space-y-2 text-slate-300">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("resultsTab.emptyState.firstMatchHeading")}
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {t("resultsTab.emptyState.firstMatchLine", {
                          home: firstKickoffMatch.home_team,
                          away: firstKickoffMatch.away_team,
                        })}
                      </p>
                      <p className="text-sm text-slate-400">
                        {t("resultsTab.emptyState.scheduledFor", {
                          time: formatMatchTime(firstKickoffMatch.match_time, effectiveTz, locale),
                        })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("resultsTab.emptyState.daysAway", { days: resultsKickoffDays })}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">{t("resultsTab.empty")}</p>
                  )}
                </div>
              </div>
            ) : (
              finishedMatches.map((m) => (
                <ResultMatchCard
                  key={m.id}
                  match={{
                    id: m.id,
                    phase: m.phase,
                    home_team: m.home_team,
                    away_team: m.away_team,
                    match_time: m.match_time,
                    home_score: m.home_score,
                    away_score: m.away_score,
                    advancing_team: m.advancing_team ?? null,
                    predicted_home: m.predicted_home,
                    predicted_away: m.predicted_away,
                    predicted_winner: m.predicted_winner,
                    predicted_advancing: m.predicted_advancing,
                    points_earned: m.points_earned,
                  }}
                  groupScoring={groupScoring}
                  stickers={stickersByMatch[m.id] ?? []}
                  hasDoubleDown={doubleDownMatchIds.has(m.id)}
                />
              ))
            )}
          </div>
        }
      />

      {spyModalMatchId && (
        <SpyModal
          matchId={spyModalMatchId}
          groupMembers={groupMembers.filter((m) => m.userId !== currentUserId)}
          onSelect={(targetUserId) => {
            setSpyModalMatchId(null);
            void togglePower(spyModalMatchId, "spy", targetUserId);
          }}
          onClose={() => setSpyModalMatchId(null)}
          tp={tp}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

function clampGroupScoreDigits(raw: string): string {
  if (raw === "") return "";
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || Number.isNaN(n)) return "";
  return String(Math.min(99, Math.max(0, n)));
}

function CompactGroupPredictionRow({
  match,
  lockPassed,
  saved,
  busy,
  isSaving,
  isToday,
  currentInput,
  onPatchInput,
  formatMatchWhen,
  lockSoonLabel,
  activePowers,
  remaining,
  powerBusy,
  togglePower,
  tp,
  limits,
  predictionsByMember,
  groupMembers,
  currentUserId,
  spyTargetDisplayName,
  spyResult,
  onSave,
  previewPoints,
  pointsPreviewVisible,
  onDismissPreview,
  t,
}: {
  match: MatchRecord;
  lockPassed: boolean;
  saved: boolean;
  busy: boolean;
  isSaving: boolean;
  isToday: boolean;
  currentInput: PredictionInput;
  onPatchInput: (patch: Partial<PredictionInput>) => void;
  formatMatchWhen: (match: MatchRecord) => string;
  lockSoonLabel: string | null;
  activePowers: Set<PowerType> | undefined;
  remaining: Record<PowerType, number>;
  powerBusy: Record<string, boolean>;
  togglePower: (matchId: string, pt: PowerType, targetUserId?: string) => void;
  tp: TranslationFn;
  limits: PowerLimits;
  predictionsByMember: string[];
  groupMembers: GroupMember[];
  currentUserId: string;
  spyTargetDisplayName: string | null;
  spyResult: { home: number; away: number; shielded: boolean } | null | undefined;
  onSave: () => void;
  previewPoints: number;
  pointsPreviewVisible: boolean;
  onDismissPreview: () => void;
  t: TranslationFn;
}) {
  const [expanded, setExpanded] = useState(false);
  const spyShowResult = !!(activePowers?.has("spy") && spyTargetDisplayName);

  const shellClass =
    lockPassed === true
      ? "rounded-lg border border-white/10 bg-dark-800 p-3 opacity-[0.88] ring-1 ring-white/10"
      : isToday
        ? "rounded-lg border border-white/5 border-l-2 border-l-amber-500 bg-dark-800 p-3 ring-1 ring-amber-500/25"
        : saved
          ? "rounded-lg border border-white/5 border-l-2 border-l-gpri bg-dark-800 p-3"
          : "rounded-lg border border-white/5 bg-dark-800 p-3";

  const oddsOk =
    match.home_win_odds != null &&
    match.draw_odds != null &&
    match.away_win_odds != null;
  const aiOk = match.ai_home_score != null && match.ai_away_score != null;
  const canExpandExtras = oddsOk || aiOk;

  const bothFilled =
    currentInput.predictedHome !== "" &&
    currentInput.predictedAway !== "" &&
    !Number.isNaN(Number(currentInput.predictedHome)) &&
    !Number.isNaN(Number(currentInput.predictedAway));
  const saving = busy || isSaving;
  const canSave = bothFilled && !saving && !lockPassed;

  const lockedScoreBoxClass =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dark-600 bg-dark-900 text-xl font-semibold tabular-nums text-slate-200";

  return (
    <div className={shellClass}>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          {isToday && !lockPassed ? (
            <div className="-mt-0.5">
              <span className="inline-flex rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/35">
                {t("badges.today")}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-base leading-none" aria-hidden>
              {getFlag(match.home_team)}
            </span>
            <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-white">
              {match.home_team}
            </span>
            {lockPassed ? (
              <span className={lockedScoreBoxClass}>{currentInput.predictedHome || "—"}</span>
            ) : (
              <input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                aria-label={t("homeScore", { team: match.home_team })}
                placeholder="—"
                value={currentInput.predictedHome}
                onChange={(e) =>
                  onPatchInput({ predictedHome: clampGroupScoreDigits(e.target.value) })
                }
                className={STACKED_GROUP_SCORE_CLASS}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-base leading-none" aria-hidden>
              {getFlag(match.away_team)}
            </span>
            <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-white">
              {match.away_team}
            </span>
            {lockPassed ? (
              <span className={lockedScoreBoxClass}>{currentInput.predictedAway || "—"}</span>
            ) : (
              <input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                aria-label={t("awayScore", { team: match.away_team })}
                placeholder="—"
                value={currentInput.predictedAway}
                onChange={(e) =>
                  onPatchInput({ predictedAway: clampGroupScoreDigits(e.target.value) })
                }
                className={STACKED_GROUP_SCORE_CLASS}
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center self-stretch">
          {lockPassed ? (
            <div
              className="flex h-11 min-h-[44px] min-w-[44px] items-center justify-center text-slate-500"
              title={t("locked")}
              aria-label={t("locked")}
              role="img"
            >
              <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
          ) : (
            <button
              type="button"
              aria-label={
                saving && bothFilled ? t("saveSaving") : saved ? t("update") : t("save")
              }
              disabled={saving || !bothFilled}
              onClick={onSave}
              className={`flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 ${
                canSave ? "bg-gpri text-white hover:brightness-110" : ""
              } ${
                saving && bothFilled
                  ? "cursor-wait bg-gpri/90 text-white disabled:opacity-100"
                  : ""
              } ${
                !canSave && !(saving && bothFilled)
                  ? "border border-dark-700 bg-dark-900/70 text-slate-600"
                  : ""
              }`}
            >
              {busy ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              ) : (
                <Save className="h-6 w-6" aria-hidden strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      </div>

      {!lockPassed ? (
        <PointsPreview
          visible={pointsPreviewVisible}
          pointsDisplay={previewPoints}
          messageTemplate={t("pointsPreview")}
          onDismiss={onDismissPreview}
        />
      ) : null}

      <p className="mt-2 text-xs leading-snug text-slate-500">
        {t("matchDate", { date: formatMatchWhen(match) })}
        {lockSoonLabel !== null ? ` · ${t("locksIn", { time: lockSoonLabel })}` : ""}
      </p>

      {!lockPassed ? (
        <PowerPanel
          matchId={match.id}
          variant="compact"
          activePowers={activePowers}
          remaining={remaining}
          busy={powerBusy}
          onToggle={togglePower}
          tp={tp}
          limits={limits}
        />
      ) : null}

      {/* Spy */}
      {spyShowResult ? (
        <SpyResultCard
          matchId={match.id}
          targetName={spyTargetDisplayName!}
          result={spyResult}
          tp={tp}
        />
      ) : null}

      <WhoHasPredicted
        groupMembers={groupMembers}
        predicted={predictionsByMember}
        currentUserId={currentUserId}
        tp={tp}
        compact
      />

      {canExpandExtras ? (
        <div className="mt-1.5 border-t border-white/5 pt-1.5">
          <button
            type="button"
            className="text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? t("compact.less") : t("compact.more")}
          </button>
          {expanded ? (
            <div className="mt-2 space-y-1.5 text-xs text-slate-500">
              {oddsOk ? (
                <p className="break-words">
                  <span aria-hidden>📊 </span>
                  <span className="tabular-nums">
                    {Number(match.home_win_odds).toFixed(2)} · {Number(match.draw_odds).toFixed(2)} ·{" "}
                    {Number(match.away_win_odds).toFixed(2)}
                  </span>
                </p>
              ) : null}
              {aiOk ? (
                <p className="break-words">
                  <span aria-hidden>🤖 </span>
                  {match.ai_home_score}-{match.ai_away_score} · {match.home_team} / {match.away_team}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PowerPanel({
  matchId,
  activePowers,
  remaining,
  busy,
  onToggle,
  tp,
  limits,
  variant = "full",
}: {
  matchId: string;
  activePowers: Set<PowerType> | undefined;
  remaining: Record<PowerType, number>;
  busy: Record<string, boolean>;
  onToggle: (matchId: string, pt: PowerType, targetUserId?: string) => void;
  tp: TranslationFn;
  limits: PowerLimits;
  variant?: "full" | "compact";
}) {
  const powers: {
    type: PowerType;
    icon: string;
    label: string;
    activeClass: string;
    limit: number;
  }[] = [
    {
      type: "double_down",
      icon: "⚡",
      label: tp("doubleDown.name"),
      activeClass: "border-amber-500 bg-amber-500/20 text-amber-400",
      limit: limits.doubleDown,
    },
    {
      type: "spy",
      icon: "🔍",
      label: tp("spy.name"),
      activeClass: "border-blue-500 bg-blue-500/20 text-blue-400",
      limit: limits.spy,
    },
    {
      type: "shield",
      icon: "🛡️",
      label: tp("shield.name"),
      activeClass: "border-gpri bg-gpri/20 text-gpri",
      limit: limits.shield,
    },
  ];

  const powerButtons =
    powers.map(({ type, icon, label, activeClass, limit }) => {
      const isActive = activePowers?.has(type) ?? false;
      const noRemaining = remaining[type] <= 0 && !isActive;
      const isBusyFlag = busy[`${matchId}-${type}`];
      const disabled = noRemaining || isBusyFlag;

      if (variant === "compact") {
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            title={label}
            aria-label={label}
            onClick={() => onToggle(matchId, type)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tabular-nums transition ${
              isActive
                ? activeClass
                : disabled
                  ? "cursor-not-allowed border-gray-700 bg-[#1a2332] text-gray-600 opacity-40"
                  : "border-gray-700 bg-[#1a2332] text-gray-400 hover:border-gray-500"
            }`}
          >
            <span aria-hidden>{icon}</span>
            <span>
              {remaining[type]}/{limit}
            </span>
          </button>
        );
      }

      return (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onToggle(matchId, type)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            isActive
              ? activeClass
              : disabled
                ? "border-gray-700 bg-[#1a2332] text-gray-600 opacity-30 cursor-not-allowed"
                : "border-gray-700 bg-[#1a2332] text-gray-400 hover:border-gray-500"
          }`}
        >
          <span>{icon}</span>
          <span>{label}</span>
          <span className="ml-1 rounded bg-dark-900/60 px-1 py-0.5 text-[10px] tabular-nums">
            {remaining[type]}/{limit}
          </span>
        </button>
      );
    });

  if (variant === "compact") {
    return (
      <div className="mt-2 flex w-full flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{powerButtons}</div>
        <div className="ml-auto shrink-0 pt-px">
          <SuperpowersHelpModal />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{tp("title")}</p>
        <SuperpowersHelpModal />
      </div>
      <div className="flex flex-wrap gap-2">{powerButtons}</div>
      {activePowers?.has("double_down") ? (
        <p className="mt-1.5 text-xs font-medium text-amber-400">{tp("doubleDown.activated")}</p>
      ) : null}
      {activePowers?.has("shield") ? (
        <p className="mt-1.5 text-xs font-medium text-gpri">{tp("shield.activated")}</p>
      ) : null}
    </div>
  );
}

function SpyResultCard({
  targetName,
  result,
  tp,
}: {
  matchId: string;
  targetName: string;
  result: { home: number; away: number; shielded: boolean } | null | undefined;
  tp: TranslationFn;
}) {
  if (result === undefined) {
    return (
      <div className="mt-2 animate-pulse rounded-lg border border-blue-800/40 bg-blue-900/20 px-3 py-2 text-xs text-blue-300">
        🔍 ...
      </div>
    );
  }
  if (result === null) {
    return (
      <div className="mt-2 rounded-lg border border-blue-800/40 bg-blue-900/20 px-3 py-2 text-xs text-blue-300">
        {tp("spy.noPrediction", { name: targetName })}
      </div>
    );
  }
  if (result.shielded) {
    return (
      <div className="mt-2 rounded-lg border border-gpri/40 bg-gpri/15 px-3 py-2 text-xs text-gsec">
        {tp("spy.blocked", { name: targetName })}
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-blue-800/40 bg-blue-900/20 px-3 py-2 text-xs text-blue-300">
      {tp("spy.result", { name: targetName, score: `${result.home}-${result.away}` })}
    </div>
  );
}

function SpyModal({
  groupMembers,
  onSelect,
  onClose,
  tp,
}: {
  matchId: string;
  groupMembers: GroupMember[];
  onSelect: (targetUserId: string) => void;
  onClose: () => void;
  tp: TranslationFn;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="animate-page-in relative w-full max-w-sm overflow-hidden rounded-xl bg-[#111720] p-6 mx-4 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md border border-dark-600 bg-dark-900/40 px-2 py-1 text-sm font-semibold text-slate-300 hover:bg-dark-700"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-sm font-semibold text-white">{tp("spy.selectTarget")}</h3>
        <div className="mt-4 space-y-2">
          {groupMembers.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => onSelect(m.userId)}
              className="flex w-full items-center gap-3 rounded-lg border border-dark-600 bg-dark-900 px-4 py-3 text-left text-sm text-white transition hover:border-blue-500/40 hover:bg-dark-700"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-400">
                {m.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <span>{m.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
