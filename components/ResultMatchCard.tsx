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
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
          <span className="inline-flex min-w-0 flex-1 basis-[140px] items-center justify-end gap-1.5 text-base font-bold leading-tight text-white sm:text-lg">
            <span aria-hidden>{getFlag(match.home_team)}</span>
            <span className="truncate">{match.home_team}</span>
          </span>
          <span className="shrink-0 text-4xl font-black tabular-nums leading-none tracking-tight text-white sm:text-5xl">
            {match.home_score}
            <span className="mx-1 text-gsec">-</span>
            {match.away_score}
          </span>
          <span className="inline-flex min-w-0 flex-1 basis-[140px] items-center justify-start gap-1.5 text-base font-bold leading-tight text-white sm:text-lg">
            <span className="truncate">{match.away_team}</span>
            <span aria-hidden>{getFlag(match.away_team)}</span>
          </span>
        </div>
        <span className="mx-auto shrink-0 rounded-md border border-white/10 bg-dark-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:mx-0">
          {tr("finalBadge")}
        </span>
      </div>

      <p className="mt-4 text-center text-sm text-slate-400">
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
