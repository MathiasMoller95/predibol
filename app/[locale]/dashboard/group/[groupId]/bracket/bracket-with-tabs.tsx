"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  computeProjectedR16,
  computeProjectedStandings,
  rankThirdPlaceTeams,
  type GroupMatchLite,
  type PredictionScores,
} from "@/lib/projected-standings";
import BracketView, { type BracketMatchVM, type BracketPredictionVM } from "./bracket-view";

type Props = {
  knockoutMatches: BracketMatchVM[];
  groupStageMatches: GroupMatchLite[];
  groupPredictionScores: PredictionScores;
  predictionsByMatchId: Record<string, BracketPredictionVM>;
};

export default function BracketWithTabs({
  knockoutMatches,
  groupStageMatches,
  groupPredictionScores,
  predictionsByMatchId,
}: Props) {
  const t = useTranslations("Bracket");

  const [tab, setTab] = useState<"actual" | "projection">(() =>
    knockoutMatches.some((m) => m.status === "finished" || m.status === "live") ? "actual" : "projection",
  );

  const projectedMatches = useMemo(() => {
    const standings = computeProjectedStandings(groupStageMatches, groupPredictionScores);
    const { rankByTeam, top8 } = rankThirdPlaceTeams(standings);
    const r16 = knockoutMatches.filter((m) => m.phase === "round_of_16");
    const slots = computeProjectedR16(r16, standings, rankByTeam, top8);
    return knockoutMatches.map((m) => {
      if (m.phase !== "round_of_16") return m;
      const label = m.knockout_label ?? m.id;
      const slot = slots.get(label);
      if (!slot) return m;
      return {
        ...m,
        home_team: slot.home.uncertain ? "?" : slot.home.team,
        away_team: slot.away.uncertain ? "?" : slot.away.team,
      };
    });
  }, [knockoutMatches, groupStageMatches, groupPredictionScores]);

  const displayMatches = tab === "actual" ? knockoutMatches : projectedMatches;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("actual")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tab === "actual" ? "bg-gpri text-white" : "border border-dark-600 bg-dark-800/80 text-slate-300 hover:bg-dark-700"
          }`}
        >
          {t("tabActual")}
        </button>
        <button
          type="button"
          onClick={() => setTab("projection")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tab === "projection" ? "bg-gpri text-white" : "border border-dark-600 bg-dark-800/80 text-slate-300 hover:bg-dark-700"
          }`}
        >
          {t("tabProjection")}
        </button>
      </div>
      {tab === "projection" ? <p className="text-xs text-slate-500">{t("projectionDisclaimer")}</p> : null}
      <BracketView
        matches={displayMatches}
        predictionsByMatchId={predictionsByMatchId}
        projectionMode={tab === "projection"}
      />
    </div>
  );
}
