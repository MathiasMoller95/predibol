"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { getFlag } from "@/lib/team-metadata";
import {
  BRACKET_NODE_GAP,
  BRACKET_NODE_HEIGHT,
  BRACKET_QF_LEFT,
  BRACKET_QF_RIGHT,
  BRACKET_R16_LEFT,
  BRACKET_R16_RIGHT,
  BRACKET_SF_LEFT,
  BRACKET_SF_RIGHT,
  bracketTreeHeight,
  compareKnockoutLabels,
  parentTops,
  stackedTops,
} from "@/lib/knockout-bracket-utils";

export type BracketMatchVM = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  knockout_label: string | null;
  home_source: string | null;
  away_source: string | null;
  match_time: string;
  locked_at: string;
};

export type BracketPredictionVM = {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
};

type Props = {
  matches: BracketMatchVM[];
  predictionsByMatchId: Record<string, BracketPredictionVM>;
  /** When true, R16 sides marked "?" use dashed styling (projection tab). */
  projectionMode?: boolean;
};

const NODE = BRACKET_NODE_HEIGHT;
const GAP = BRACKET_NODE_GAP;

const PHASE_SECTION_ORDER = ["round_of_16", "quarter_final", "semi_final", "final", "third_place"] as const;

function phaseSectionLabel(t: ReturnType<typeof useTranslations<"Bracket">>, phase: string): string {
  switch (phase) {
    case "round_of_16":
      return t("phaseRoundOf16");
    case "quarter_final":
      return t("phaseQuarter");
    case "semi_final":
      return t("phaseSemi");
    case "final":
      return t("final");
    case "third_place":
      return t("thirdPlace");
    default:
      return phase;
  }
}

function formatSourceLine(t: ReturnType<typeof useTranslations<"Bracket">>, raw: string | null): string {
  if (!raw) return "—";
  if (raw.startsWith("W-")) {
    return `${t("winner")} ${raw.slice(2)}`;
  }
  if (raw.startsWith("L-")) {
    return `${t("loser")} ${raw.slice(2)}`;
  }
  return raw;
}

function MatchCard({
  match,
  prediction,
  t,
  projectionMode = false,
}: {
  match: BracketMatchVM | undefined;
  prediction: BracketPredictionVM | undefined;
  t: ReturnType<typeof useTranslations<"Bracket">>;
  projectionMode?: boolean;
}) {
  if (!match) {
    return (
      <div
        className="w-[200px] rounded-lg border border-[#1e293b] bg-[#111720] px-2 py-2 text-xs text-slate-500"
        style={{ minHeight: NODE }}
      >
        —
      </div>
    );
  }

  const finished = match.status === "finished";
  const live = match.status === "live";
  const h = match.home_team;
  const a = match.away_team;
  const hTbd = h === "TBD";
  const aTbd = a === "TBD";
  const hUncertain = h === "?";
  const aUncertain = a === "?";
  const hs = match.home_score;
  const as = match.away_score;

  let winner: "home" | "away" | null = null;
  if (finished && hs != null && as != null) {
    if (hs > as) winner = "home";
    else if (as > hs) winner = "away";
  }

  const rowClass = (side: "home" | "away") => {
    const base = "flex items-center justify-between gap-2 px-2 py-1.5 text-sm";
    const uncertain = side === "home" ? hUncertain : aUncertain;
    const dash = projectionMode && uncertain ? " mx-1 rounded border border-dashed border-slate-500/45" : "";
    if (!finished) return `${base}${dash} text-slate-200`;
    if (winner === side) return `${base} border-l-2 border-gpri bg-gpri/20 text-white`;
    return `${base} text-slate-400`;
  };

  return (
    <div className="w-[200px] rounded-lg border border-[#1e293b] bg-[#111720] shadow-sm">
      {live ? (
        <div className="flex items-center gap-2 border-b border-[#1e293b] px-2 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gsec opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gpri" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gpri">{t("live")}</span>
        </div>
      ) : null}
      <div className={rowClass("home")}>
        <span className="min-w-0 truncate">
          {hUncertain ? (
            <span className="font-medium text-slate-400">?</span>
          ) : !hTbd ? (
            <>
              <span aria-hidden>{getFlag(h)}</span> <span className="font-medium">{h}</span>
            </>
          ) : (
            <span className="text-slate-500">{formatSourceLine(t, match.home_source)}</span>
          )}
        </span>
        <span className="shrink-0 tabular-nums text-slate-300">
          {finished && hs != null ? hs : !hTbd && !aTbd && !hUncertain && !aUncertain && !finished ? "–" : ""}
        </span>
      </div>
      <div className="h-px bg-[#1e293b]" />
      <div className={rowClass("away")}>
        <span className="min-w-0 truncate">
          {aUncertain ? (
            <span className="font-medium text-slate-400">?</span>
          ) : !aTbd ? (
            <>
              <span aria-hidden>{getFlag(a)}</span> <span className="font-medium">{a}</span>
            </>
          ) : (
            <span className="text-slate-500">{formatSourceLine(t, match.away_source)}</span>
          )}
        </span>
        <span className="shrink-0 tabular-nums text-slate-300">
          {finished && as != null ? as : !hTbd && !aTbd && !hUncertain && !aUncertain && !finished ? "–" : ""}
        </span>
      </div>
      {hTbd && aTbd ? (
        <p className="border-t border-[#1e293b] px-2 py-1 text-[10px] text-slate-500">{t("teamsTbd")}</p>
      ) : null}
      {prediction && (!hTbd || !aTbd) && !hUncertain && !aUncertain ? (
        <p className="border-t border-[#1e293b] px-2 py-0.5 text-[10px] text-gpri/90">
          {t("yourPrediction")}: {prediction.predicted_home}-{prediction.predicted_away}
        </p>
      ) : null}
    </div>
  );
}

function ConnectorColumn({
  leftTops,
  parentTops: parents,
  height,
}: {
  leftTops: number[];
  parentTops: number[];
  height: number;
}) {
  const w = 44;
  return (
    <div className="relative shrink-0" style={{ width: w, height }}>
      <svg width={w} height={height} className="absolute left-0 top-0 text-[#1e293b]" aria-hidden>
        {parents.map((_, i) => {
          const y1 = leftTops[i * 2]! + NODE / 2;
          const y2 = leftTops[i * 2 + 1]! + NODE / 2;
          const ym = parents[i]! + NODE / 2;
          const xM = 18;
          return (
            <g key={i}>
              <path d={`M 0 ${y1} H ${xM} V ${ym} H ${w}`} stroke="currentColor" strokeWidth={2} fill="none" />
              <path d={`M 0 ${y2} H ${xM} V ${ym} H ${w}`} stroke="currentColor" strokeWidth={2} fill="none" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BridgeToFinal({
  sfTops,
  finalTop,
  height,
  fromLeft,
}: {
  sfTops: number[];
  finalTop: number;
  height: number;
  fromLeft: boolean;
}) {
  const w = 48;
  const y1 = sfTops[0]! + NODE / 2;
  const y2 = sfTops[1]! + NODE / 2;
  const ym = finalTop + NODE / 2;
  return (
    <div className="relative shrink-0" style={{ width: w, height }}>
      <svg width={w} height={height} className="absolute left-0 top-0 text-[#1e293b]" aria-hidden>
        {fromLeft ? (
          <>
            <path d={`M ${w} ${y1} H 26 V ${ym} H 0`} stroke="currentColor" strokeWidth={2} fill="none" />
            <path d={`M ${w} ${y2} H 26 V ${ym} H 0`} stroke="currentColor" strokeWidth={2} fill="none" />
          </>
        ) : (
          <>
            <path d={`M 0 ${y1} H 22 V ${ym} H ${w}`} stroke="currentColor" strokeWidth={2} fill="none" />
            <path d={`M 0 ${y2} H 22 V ${ym} H ${w}`} stroke="currentColor" strokeWidth={2} fill="none" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function BracketView({ matches, predictionsByMatchId, projectionMode = false }: Props) {
  const t = useTranslations("Bracket");

  const byLabel = useMemo(() => {
    const map: Record<string, BracketMatchVM | undefined> = {};
    for (const m of matches) {
      if (m.knockout_label) map[m.knockout_label] = m;
    }
    return map;
  }, [matches]);

  const r16L = stackedTops(8, NODE, GAP);
  const qfL = parentTops(r16L, NODE);
  const sfL = parentTops(qfL, NODE);

  const r16R = stackedTops(8, NODE, GAP);
  const qfR = parentTops(r16R, NODE);
  const sfR = parentTops(qfR, NODE);

  const mergeLC = parentTops(sfL, NODE)[0]! + NODE / 2;
  const mergeRC = parentTops(sfR, NODE)[0]! + NODE / 2;
  const finalTop = (mergeLC + mergeRC) / 2 - NODE / 2;
  const thirdTop = finalTop + NODE + 28;

  const treeH = bracketTreeHeight(8, NODE, GAP);
  const centerH = Math.max(treeH, thirdTop + NODE + 32);

  const finalMatch = matches.find((m) => m.knockout_label === "F");
  const thirdMatch = matches.find((m) => m.knockout_label === "3RD");

  const mobileSections = PHASE_SECTION_ORDER.map((phase) => ({
    phase,
    label: phaseSectionLabel(t, phase),
    items: matches.filter((m) => m.phase === phase).sort((a, b) => compareKnockoutLabels(a.knockout_label, b.knockout_label)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-xs text-slate-500">{t("scrollHint")}</p>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex min-w-max items-start gap-0 py-2">
            <RoundColumn
              labels={[...BRACKET_R16_LEFT]}
              tops={r16L}
              treeH={treeH}
              byLabel={byLabel}
              predictionsByMatchId={predictionsByMatchId}
              t={t}
              projectionMode={projectionMode}
            />
            <ConnectorColumn leftTops={r16L} parentTops={qfL} height={treeH} />
            <RoundColumn
              labels={[...BRACKET_QF_LEFT]}
              tops={qfL}
              treeH={treeH}
              byLabel={byLabel}
              predictionsByMatchId={predictionsByMatchId}
              t={t}
              projectionMode={projectionMode}
            />
            <ConnectorColumn leftTops={qfL} parentTops={sfL} height={treeH} />
            <RoundColumn
              labels={[...BRACKET_SF_LEFT]}
              tops={sfL}
              treeH={treeH}
              byLabel={byLabel}
              predictionsByMatchId={predictionsByMatchId}
              t={t}
              projectionMode={projectionMode}
            />
            <BridgeToFinal sfTops={sfL} finalTop={finalTop} height={treeH} fromLeft />

            <div className="relative shrink-0 px-1" style={{ width: 200, minHeight: centerH }}>
              <div className="absolute left-0 w-[200px]" style={{ top: finalTop }}>
                <MatchCard
                  match={finalMatch}
                  prediction={finalMatch ? predictionsByMatchId[finalMatch.id] : undefined}
                  t={t}
                  projectionMode={projectionMode}
                />
              </div>
              <div className="absolute left-0 w-[200px]" style={{ top: thirdTop }}>
                <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t("thirdPlace")}</p>
                <MatchCard
                  match={thirdMatch}
                  prediction={thirdMatch ? predictionsByMatchId[thirdMatch.id] : undefined}
                  t={t}
                  projectionMode={projectionMode}
                />
              </div>
            </div>

            <BridgeToFinal sfTops={sfR} finalTop={finalTop} height={treeH} fromLeft={false} />
            <RoundColumn
              labels={[...BRACKET_SF_RIGHT]}
              tops={sfR}
              treeH={treeH}
              byLabel={byLabel}
              predictionsByMatchId={predictionsByMatchId}
              t={t}
              projectionMode={projectionMode}
            />
            <ConnectorColumn leftTops={qfR} parentTops={sfR} height={treeH} />
            <RoundColumn
              labels={[...BRACKET_QF_RIGHT]}
              tops={qfR}
              treeH={treeH}
              byLabel={byLabel}
              predictionsByMatchId={predictionsByMatchId}
              t={t}
              projectionMode={projectionMode}
            />
            <ConnectorColumn leftTops={r16R} parentTops={qfR} height={treeH} />
            <RoundColumn
              labels={[...BRACKET_R16_RIGHT]}
              tops={r16R}
              treeH={treeH}
              byLabel={byLabel}
              predictionsByMatchId={predictionsByMatchId}
              t={t}
              projectionMode={projectionMode}
            />
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {mobileSections.map(({ phase, label, items }, idx) => (
          <details key={phase} open={idx === 0} className="rounded-lg border border-dark-600 bg-dark-800/80">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white">{label}</summary>
            <div className="space-y-3 border-t border-dark-600 p-3">
              {items.map((m) => (
                <MatchCard key={m.id} match={m} prediction={predictionsByMatchId[m.id]} t={t} projectionMode={projectionMode} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function RoundColumn({
  labels,
  tops,
  treeH,
  byLabel,
  predictionsByMatchId,
  t,
  projectionMode,
}: {
  labels: readonly string[];
  tops: number[];
  treeH: number;
  byLabel: Record<string, BracketMatchVM | undefined>;
  predictionsByMatchId: Record<string, BracketPredictionVM>;
  t: ReturnType<typeof useTranslations<"Bracket">>;
  projectionMode: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: 200, minHeight: treeH }}>
      {labels.map((lb, i) => (
        <div key={lb} className="absolute left-0" style={{ top: tops[i] }}>
          <MatchCard
            match={byLabel[lb]}
            prediction={byLabel[lb] ? predictionsByMatchId[byLabel[lb]!.id] : undefined}
            t={t}
            projectionMode={projectionMode}
          />
        </div>
      ))}
    </div>
  );
}
