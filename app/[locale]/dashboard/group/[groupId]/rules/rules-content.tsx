"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { computeGroupStagePoints, type GroupScoringConfig } from "@/lib/group-match-scoring";
import { getFlag } from "@/lib/team-metadata";

const ACTUAL_HOME = 3;
const ACTUAL_AWAY = 1;
const HOME_NAME = "Mexico";
const AWAY_NAME = "South Africa";

const INPUT_CLASS =
  "min-h-[48px] w-full max-w-[72px] rounded-lg border border-dark-500 bg-dark-900 px-2 text-center text-xl font-semibold tabular-nums text-white outline-none transition-colors duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50";

type Props = {
  locale: string;
  groupId: string;
  groupName: string;
  pointsResult: number;
  pointsDiff: number;
  pointsExact: number;
};

type ExampleRowDef = {
  predHome: number;
  predAway: number;
  labelKey: "exact" | "sameDiff" | "resultNarrow" | "resultWide" | "drawWrong" | "awayWrong";
  highlight?: boolean;
};

const EXAMPLE_ROWS: ExampleRowDef[] = [
  { predHome: 3, predAway: 1, labelKey: "exact", highlight: true },
  { predHome: 2, predAway: 0, labelKey: "sameDiff" },
  { predHome: 1, predAway: 0, labelKey: "resultNarrow" },
  { predHome: 2, predAway: 1, labelKey: "resultWide" },
  { predHome: 1, predAway: 1, labelKey: "drawWrong" },
  { predHome: 0, predAway: 2, labelKey: "awayWrong" },
];

function CellCheck({ ok }: { ok: boolean }) {
  return (
    <span className={ok ? "text-emerald-400" : "text-red-400/90"} aria-hidden>
      {ok ? "✅" : "❌"}
    </span>
  );
}

function fmtPts(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

export default function RulesContent({
  locale,
  groupId,
  groupName,
  pointsResult,
  pointsDiff,
  pointsExact,
}: Props) {
  const t = useTranslations("Rules");
  const tv = useTranslations("VirtualBets");

  const config: GroupScoringConfig = useMemo(
    () => ({
      points_correct_result: pointsResult,
      points_correct_difference: pointsDiff,
      points_exact_score: pointsExact,
    }),
    [pointsResult, pointsDiff, pointsExact]
  );

  const maxPerMatch = pointsResult + pointsDiff + pointsExact;

  const [predHomeStr, setPredHomeStr] = useState("");
  const [predAwayStr, setPredAwayStr] = useState("");

  const calcParsed = useMemo(() => {
    const h = predHomeStr.trim() === "" ? NaN : Number.parseInt(predHomeStr, 10);
    const a = predAwayStr.trim() === "" ? NaN : Number.parseInt(predAwayStr, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) return null;
    return computeGroupStagePoints(h, a, ACTUAL_HOME, ACTUAL_AWAY, config);
  }, [predHomeStr, predAwayStr, config]);

  return (
    <main className="animate-page-in min-h-screen bg-[#0A0E14] px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          {t("back", { groupName })}
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{t("title")}</h1>
          <p className="text-slate-400">{t("subtitle", { groupName })}</p>
        </header>

        {/* Section 1: Match predictions */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("matches.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("matches.description")}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-dark-600 bg-dark-900/50 p-4">
              <span className="text-2xl" aria-hidden>
                ✅
              </span>
              <p className="mt-2 font-semibold text-white">{t("matches.result.label")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                {t("matches.result.points", { points: pointsResult })}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("matches.result.description")}</p>
            </div>
            <div className="rounded-lg border border-dark-600 bg-dark-900/50 p-4">
              <span className="text-2xl" aria-hidden>
                📏
              </span>
              <p className="mt-2 font-semibold text-white">{t("matches.difference.label")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                {t("matches.difference.points", { points: pointsDiff })}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("matches.difference.description")}</p>
            </div>
            <div className="rounded-lg border border-dark-600 bg-dark-900/50 p-4">
              <span className="text-2xl" aria-hidden>
                🎯
              </span>
              <p className="mt-2 font-semibold text-white">{t("matches.exact.label")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                {t("matches.exact.points", { points: pointsExact })}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("matches.exact.description")}</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-300">{t("matches.additive")}</p>
          <p className="mt-2 text-base font-bold text-emerald-400">
            {t("matches.maximum", { total: maxPerMatch })}
          </p>
        </section>

        {/* Section 2: Example + table + calculator */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("example.title")}</h2>
          <p className="mt-3 text-sm font-medium text-slate-200">
            <span aria-hidden>{getFlag(HOME_NAME)}</span> {HOME_NAME}{" "}
            <span className="tabular-nums text-emerald-300">
              {ACTUAL_HOME}-{ACTUAL_AWAY}
            </span>{" "}
            {AWAY_NAME} <span aria-hidden>{getFlag(AWAY_NAME)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("example.actualResultCaption")}</p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-dark-600 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">{t("example.colPrediction")}</th>
                  <th className="py-2 pr-3 text-center">{t("example.colResult")}</th>
                  <th className="py-2 pr-3 text-center">{t("example.colDifference")}</th>
                  <th className="py-2 pr-3 text-center">{t("example.colExact")}</th>
                  <th className="py-2 pr-3 text-right">{t("example.colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ROWS.map((row) => {
                  const b = computeGroupStagePoints(
                    row.predHome,
                    row.predAway,
                    ACTUAL_HOME,
                    ACTUAL_AWAY,
                    config
                  );
                  const highlight = row.highlight ?? false;
                  return (
                    <tr
                      key={`${row.predHome}-${row.predAway}-${row.labelKey}`}
                      className={`border-b border-dark-600/80 ${
                        highlight
                          ? "bg-emerald-950/30 shadow-[inset_4px_0_0_0_rgba(16,185,129,0.6)] ring-1 ring-inset ring-emerald-500/20"
                          : "odd:bg-dark-900/20"
                      }`}
                    >
                      <td className="py-2.5 pr-3 text-slate-200">
                        {t(`example.rows.${row.labelKey}`)} ({row.predHome}-{row.predAway})
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <CellCheck ok={b.correctResult} />
                        <span className="ml-1 font-mono tabular-nums text-slate-300">
                          {fmtPts(b.resultPts)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <CellCheck ok={b.correctDifference} />
                        <span className="ml-1 font-mono tabular-nums text-slate-300">
                          {fmtPts(b.diffPts)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <CellCheck ok={b.exactScore} />
                        <span className="ml-1 font-mono tabular-nums text-slate-300">
                          {fmtPts(b.exactPts)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono font-bold tabular-nums text-emerald-400">
                        {b.total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-xl border border-emerald-500/30 bg-dark-900/40 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white">{t("example.tryYourPrediction")}</h3>
            <p className="mt-2 text-xs text-slate-500">
              {t("example.fixedActual", { home: ACTUAL_HOME, away: ACTUAL_AWAY })}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">{t("example.yourPrediction")}</span>
              <input
                type="text"
                inputMode="numeric"
                className={INPUT_CLASS}
                value={predHomeStr}
                onChange={(e) => setPredHomeStr(e.target.value.replace(/[^\d]/g, ""))}
                aria-label={t("example.inputHomeAria")}
              />
              <span className="text-slate-500">—</span>
              <input
                type="text"
                inputMode="numeric"
                className={INPUT_CLASS}
                value={predAwayStr}
                onChange={(e) => setPredAwayStr(e.target.value.replace(/[^\d]/g, ""))}
                aria-label={t("example.inputAwayAria")}
              />
            </div>

            {calcParsed ? (
              <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
                <li>
                  {t("example.lineResult", {
                    mark: calcParsed.correctResult ? "✅" : "❌",
                    points: calcParsed.resultPts,
                  })}
                </li>
                <li>
                  {t("example.lineDifference", {
                    mark: calcParsed.correctDifference ? "✅" : "❌",
                    points: calcParsed.diffPts,
                  })}
                </li>
                <li>
                  {t("example.lineExact", {
                    mark: calcParsed.exactScore ? "✅" : "❌",
                    points: calcParsed.exactPts,
                  })}
                </li>
                <li className="pt-2 font-semibold text-emerald-400">
                  {t("example.lineTotal", { total: calcParsed.total })}
                </li>
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{t("example.enterPredictionHint")}</p>
            )}
          </div>
        </section>

        {/* Knockout */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("knockout.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("knockout.description")}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("knockout.drawRule")}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {t("knockout.bonus", { points: pointsResult })}
          </p>
        </section>

        {/* Picks */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("picks.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("picks.description")}</p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-300">
            <li>{t("picks.champion")}</li>
            <li>{t("picks.runnerUp")}</li>
            <li>{t("picks.thirdPlace")}</li>
            <li>{t("picks.topScorer")}</li>
            <li>{t("picks.bestPlayer")}</li>
            <li>{t("picks.bestGoalkeeper")}</li>
          </ul>
          <p className="mt-4 text-sm text-amber-200/80">{t("picks.tbd")}</p>
        </section>

        {/* Tiebreakers */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("tiebreakers.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("tiebreakers.description")}</p>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-300">
            <li>{t("tiebreakers.rule1")}</li>
            <li>{t("tiebreakers.rule2")}</li>
            <li>{t("tiebreakers.rule3")}</li>
          </ol>
        </section>

        {/* Virtual trader */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("virtualTrader.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {t("virtualTrader.description", { tab: tv("tab.virtualBets") })}
          </p>
          <p className="mt-2 text-sm text-slate-500">{t("virtualTrader.disclaimer")}</p>
        </section>
      </div>
    </main>
  );
}
