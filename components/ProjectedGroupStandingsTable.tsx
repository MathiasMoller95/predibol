"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { getFlag } from "@/lib/team-metadata";
import {
  type GroupMatchLite,
  type PredictionScores,
  computeGroupStandingsForLetter,
} from "@/lib/projected-standings";

type Props = {
  groupLetter: string;
  groupStageMatches: GroupMatchLite[];
  predictionScores: PredictionScores;
};

export default function ProjectedGroupStandingsTable({
  groupLetter,
  groupStageMatches,
  predictionScores,
}: Props) {
  const t = useTranslations("Predictions.projected");

  const letterMatches = useMemo(
    () => groupStageMatches.filter((m) => m.phase === "group"),
    [groupStageMatches],
  );

  const predictedCount = useMemo(() => {
    return letterMatches.filter((m) => {
      const p = predictionScores[m.id];
      return p !== undefined && p !== null;
    }).length;
  }, [letterMatches, predictionScores]);

  const rows = useMemo(
    () => computeGroupStandingsForLetter(groupLetter, groupStageMatches, predictionScores),
    [groupLetter, groupStageMatches, predictionScores],
  );

  if (predictedCount < 1 || rows.length === 0) {
    return null;
  }

  const incomplete = predictedCount < 6;

  return (
    <div className="mt-8 rounded-xl border border-dark-600 bg-dark-900/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">
          {t("title")}{" "}
          <span className="font-normal text-slate-400">
            ({t("predictedFraction", { count: predictedCount })})
          </span>
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">{t("disclaimer")}</p>
      {incomplete ? (
        <p className="mt-2 text-xs text-slate-500">{t("completeNudge")}</p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-dark-600 text-slate-500">
              <th className="pb-2 pr-2 font-medium">{t("colPos")}</th>
              <th className="pb-2 pr-2 font-medium">{t("colTeam")}</th>
              <th className="pb-2 pr-2 text-right font-medium tabular-nums">{t("colPts")}</th>
              <th className="pb-2 pr-2 text-right font-medium tabular-nums">{t("colW")}</th>
              <th className="pb-2 pr-2 text-right font-medium tabular-nums">{t("colD")}</th>
              <th className="pb-2 pr-2 text-right font-medium tabular-nums">{t("colL")}</th>
              <th className="pb-2 pr-2 text-right font-medium tabular-nums">{t("colGF")}</th>
              <th className="pb-2 pr-2 text-right font-medium tabular-nums">{t("colGA")}</th>
              <th className="pb-2 text-right font-medium tabular-nums">{t("colGD")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const pos = idx + 1;
              let rowBg = "";
              if (pos <= 2) rowBg = "bg-gpri/10";
              else if (pos === 3) rowBg = "bg-amber-500/10";
              else rowBg = "bg-red-500/5";
              return (
                <tr key={row.team} className={`border-b border-dark-700/80 ${rowBg}`}>
                  <td className="py-2 pr-2 tabular-nums text-slate-300">{pos}</td>
                  <td className="py-2 pr-2 font-medium text-white">
                    <span aria-hidden>{getFlag(row.team)}</span> {row.team}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-200">{row.pts}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-300">{row.w}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-300">{row.d}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-300">{row.l}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-300">{row.gf}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-slate-300">{row.ga}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{row.gd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
