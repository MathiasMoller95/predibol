"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  applyDoubleDown,
  computeTierBreakdown,
  type GroupScoringRow,
  pointsQualityFromBreakdown,
  sumBreakdown,
} from "@/lib/match-points-client";
import { getFlag } from "@/lib/team-metadata";
import WhoHasPredicted, { type WhoHasPredictedMember } from "@/components/WhoHasPredicted";
import type { PowerType } from "@/lib/constants";

const LIVE_POLL_MS = 60_000;

const MATCH_SELECT =
  "id,phase,home_team,away_team,match_time,locked_at,status,home_win_odds,draw_odds,away_win_odds,ai_home_score,ai_away_score,knockout_label,home_score,away_score,advancing_team";

export type LiveMatchRow = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
  match_time: string;
  locked_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  advancing_team: string | null;
  knockout_label: string | null;
};

type UserPred = {
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  predicted_advancing: string | null;
};

export function LiveMatchesSection({
  initialMatches,
  groupScoring,
  predictionLookup,
  powerActiveByMatch,
  predictionsByMatch,
  groupMembers,
  currentUserId,
}: {
  initialMatches: LiveMatchRow[];
  groupScoring: GroupScoringRow;
  predictionLookup: Record<string, UserPred | undefined>;
  powerActiveByMatch: Record<string, Set<PowerType> | undefined>;
  predictionsByMatch: Record<string, string[]>;
  groupMembers: WhoHasPredictedMember[];
  currentUserId: string;
}) {
  const tLive = useTranslations("Predictions.live");
  const [rows, setRows] = useState<LiveMatchRow[]>(initialMatches);
  const idsRef = useRef<string[]>(initialMatches.map((m) => m.id));

  useEffect(() => {
    idsRef.current = initialMatches.map((m) => m.id);
    setRows(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    const ids = idsRef.current;
    if (ids.length === 0) return;

    const client = createClient();

    async function poll() {
      const { data, error } = await client.from("matches").select(MATCH_SELECT).in("id", ids);
      if (error) return;
      const next = ((data ?? []) as LiveMatchRow[]).filter((m) => m.status === "live");
      next.sort((a, b) => a.match_time.localeCompare(b.match_time));
      setRows(next);
    }

    const interval = window.setInterval(poll, LIVE_POLL_MS);
    void poll();
    return () => window.clearInterval(interval);
  }, []);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-[11px] text-slate-500">{tLive("pollHint")}</p>
      {rows.map((match) => (
        <LiveMatchCard
          key={match.id}
          match={match}
          groupScoring={groupScoring}
          prediction={predictionLookup[match.id]}
          hasDoubleDown={powerActiveByMatch[match.id]?.has("double_down") ?? false}
          predictionsByMatch={predictionsByMatch}
          groupMembers={groupMembers}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

export default function LiveMatchCard({
  match,
  groupScoring,
  prediction,
  hasDoubleDown,
  predictionsByMatch,
  groupMembers,
  currentUserId,
}: {
  match: LiveMatchRow;
  groupScoring: GroupScoringRow;
  prediction?: UserPred;
  hasDoubleDown: boolean;
  predictionsByMatch: Record<string, string[]>;
  groupMembers: WhoHasPredictedMember[];
  currentUserId: string;
}) {
  const tLive = useTranslations("Predictions.live");
  const tp = useTranslations("Powers");

  const [flash, setFlash] = useState(false);
  const prevScore = useRef<{ h: number; a: number } | null>(null);

  const H = match.home_score ?? 0;
  const A = match.away_score ?? 0;

  useEffect(() => {
    const p = prevScore.current;
    if (p && (p.h !== H || p.a !== A)) {
      setFlash(true);
      const tm = window.setTimeout(() => setFlash(false), 700);
      return () => window.clearTimeout(tm);
    }
    prevScore.current = { h: H, a: A };
  }, [H, A]);

  const breakdown =
    prediction != null
      ? computeTierBreakdown(
          H,
          A,
          match.phase,
          {
            predicted_home: prediction.predicted_home,
            predicted_away: prediction.predicted_away,
            predicted_winner: prediction.predicted_winner,
            predicted_advancing: prediction.predicted_advancing,
          },
          match.home_team,
          match.away_team,
          groupScoring,
        )
      : null;

  const baseTotal = breakdown ? sumBreakdown(breakdown) : 0;
  const total = applyDoubleDown(baseTotal, hasDoubleDown);
  const quality = breakdown ? pointsQualityFromBreakdown(breakdown) : "wrong";

  const pointsColor =
    quality === "exact"
      ? "text-amber-300"
      : quality === "good"
        ? "text-emerald-400"
        : "text-red-400";

  const pointsLabel =
    quality === "exact" ? `${tLive("currentPoints", { points: total })} ✨` : tLive("currentPoints", { points: total });

  return (
    <div
      className={`rounded-xl border border-dark-600 bg-dark-800 p-4 transition-shadow duration-300 ${
        flash ? "ring-2 ring-gpri/50 shadow-[0_0_24px_rgba(16,185,129,0.2)]" : ""
      }`}
    >
      <div className="relative flex flex-col items-center gap-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xl font-bold leading-tight text-white sm:text-2xl">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>{getFlag(match.home_team)}</span>
            {match.home_team}
          </span>
          <span className="relative inline-flex items-center gap-2 tabular-nums">
            <span className="text-3xl font-black tracking-tight sm:text-4xl">
              {H} - {A}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            {match.away_team}
            <span aria-hidden>{getFlag(match.away_team)}</span>
          </span>
        </div>
        <p className="text-xs text-slate-500">
          ⏱️ {tLive("inProgress")}
        </p>
      </div>

      {prediction != null ? (
        <>
          <p className="mt-4 text-center text-xs text-slate-500">
            {tLive("yourPrediction", {
              home: prediction.predicted_home,
              away: prediction.predicted_away,
            })}
          </p>
          <p className={`mt-1 text-center text-sm font-semibold ${pointsColor}`}>{pointsLabel}</p>
        </>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-500">{tLive("noPredictionYet")}</p>
      )}

      {hasDoubleDown ? (
        <p className="mt-2 text-center text-xs font-medium text-amber-400/90">⚡ {tLive("doubleDownActive")}</p>
      ) : null}

      <WhoHasPredicted
        matchId={match.id}
        groupMembers={groupMembers}
        predicted={predictionsByMatch[match.id] ?? []}
        currentUserId={currentUserId}
        tp={tp}
      />
    </div>
  );
}
