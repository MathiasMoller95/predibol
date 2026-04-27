"use client";

import { useTranslations } from "next-intl";
import { computeTierBreakdown, type GroupScoringRow } from "@/lib/match-points-client";
import { getFlag } from "@/lib/team-metadata";

export type ResultMatchData = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
  match_time: string;
  home_score: number;
  away_score: number;
  advancing_team: string | null;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  predicted_advancing: string | null;
  points_earned: number;
};

type StickerEntry = { team: string; tier: string };

function tierMedal(tier: string): string {
  const t = tier.toLowerCase();
  if (t === "gold") return "🥇";
  if (t === "silver") return "🥈";
  return "🥉";
}

export default function ResultMatchCard({
  match,
  groupScoring,
  stickers,
  hasDoubleDown,
}: {
  match: ResultMatchData;
  groupScoring: GroupScoringRow;
  stickers: StickerEntry[];
  hasDoubleDown: boolean;
}) {
  const t = useTranslations("Predictions");
  const tr = useTranslations("Predictions.results");

  const d = computeTierBreakdown(
    match.home_score,
    match.away_score,
    match.phase,
    {
      predicted_home: match.predicted_home,
      predicted_away: match.predicted_away,
      predicted_winner: match.predicted_winner,
      predicted_advancing: match.predicted_advancing,
    },
    match.home_team,
    match.away_team,
    match.advancing_team,
    groupScoring,
  );

  const segments: string[] = [];

  segments.push(
    d.hitResult
      ? tr("breakdownResultHit", { points: d.resultPts })
      : tr("breakdownResultMiss"),
  );
  segments.push(
    d.hitDiff
      ? tr("breakdownDiffHit", { points: d.diffPts })
      : tr("breakdownDiffMiss"),
  );
  const exactPtsTotal = d.exactPtsBase + d.knockoutWinnerPts;
  segments.push(
    exactPtsTotal > 0 ? tr("breakdownExactHit", { points: exactPtsTotal }) : tr("breakdownExactMiss"),
  );
  if (d.advancingPts > 0) {
    segments.push(tr("breakdownAdvancingHit", { points: d.advancingPts }));
  }

  const breakdownLine = segments.join(tr("breakdownSeparator"));

  const pointsBadge =
    match.points_earned > 0 ? (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/40">
        {tr("pointsEarned", { points: match.points_earned })}
      </span>
    ) : (
      <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-600">
        {tr("pointsZero")}
      </span>
    );

  return (
    <article className="rounded-xl border border-dark-600 bg-dark-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center justify-center gap-2 text-center text-lg font-bold text-white sm:text-xl">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{getFlag(match.home_team)}</span>
              {match.home_team}
            </span>
            <span className="tabular-nums text-gsec">
              {match.home_score} - {match.away_score}
            </span>
            <span className="inline-flex items-center gap-1">
              {match.away_team}
              <span aria-hidden>{getFlag(match.away_team)}</span>
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 bg-dark-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {tr("finalBadge")}
        </span>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        {t("yourPick", { home: match.predicted_home, away: match.predicted_away })}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{pointsBadge}</div>

      {hasDoubleDown ? (
        <p className="mt-2 text-center text-xs font-medium text-amber-400/90">
          ⚡ {tr("doubleDownLine", { points: match.points_earned })}
        </p>
      ) : null}

      <p className="mt-3 text-center text-[11px] leading-snug text-slate-400">{breakdownLine}</p>

      {stickers.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[11px] text-slate-300">
          {stickers.map((s, i) => (
            <span key={`${s.team}-${i}`}>
              {tierMedal(s.tier)} {s.team}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
