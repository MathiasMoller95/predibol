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
  "min-h-[48px] w-20 max-w-[80px] shrink-0 rounded-lg border border-dark-500 bg-dark-900 px-2 text-center text-xl font-semibold tabular-nums text-white outline-none transition-colors duration-150 focus:border-gpri focus:ring-2 focus:ring-gpri/50";

type Props = {
  locale: string;
  groupId: string;
  groupName: string;
  pointsResult: number;
  pointsDiff: number;
  pointsExact: number;
  bonusChampion: number;
  bonusRunnerUp: number;
  bonusThirdPlace: number;
  bonusTopScorer: number;
  bonusBestPlayer: number;
  bonusBestGoalkeeper: number;
  powersDoubleDown: number;
  powersSpy: number;
  powersShield: number;
  isAdmin: boolean;
};

type PickCategoryKey =
  | "champion"
  | "runnerUp"
  | "thirdPlace"
  | "topScorer"
  | "bestPlayer"
  | "bestGoalkeeper";

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
    <span className={ok ? "text-gpri" : "text-red-400/90"} aria-hidden>
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
  bonusChampion,
  bonusRunnerUp,
  bonusThirdPlace,
  bonusTopScorer,
  bonusBestPlayer,
  bonusBestGoalkeeper,
  powersDoubleDown,
  powersSpy,
  powersShield,
  isAdmin,
}: Props) {
  const t = useTranslations("Rules");
  const tv = useTranslations("VirtualBets");

  const pickCategories: { key: PickCategoryKey; points: number }[] = useMemo(
    () => [
      { key: "champion", points: bonusChampion },
      { key: "runnerUp", points: bonusRunnerUp },
      { key: "thirdPlace", points: bonusThirdPlace },
      { key: "topScorer", points: bonusTopScorer },
      { key: "bestPlayer", points: bonusBestPlayer },
      { key: "bestGoalkeeper", points: bonusBestGoalkeeper },
    ],
    [
      bonusChampion,
      bonusRunnerUp,
      bonusThirdPlace,
      bonusTopScorer,
      bonusBestPlayer,
      bonusBestGoalkeeper,
    ]
  );

  const maxPickBonus = useMemo(
    () => pickCategories.reduce((s, row) => s + row.points, 0),
    [pickCategories]
  );

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
          className="inline-block text-sm font-medium text-gpri hover:text-gpri/90"
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
              <p className="mt-1 font-mono text-lg font-bold text-gpri">
                {t("matches.result.points", { points: pointsResult })}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("matches.result.description")}</p>
            </div>
            <div className="rounded-lg border border-dark-600 bg-dark-900/50 p-4">
              <span className="text-2xl" aria-hidden>
                📏
              </span>
              <p className="mt-2 font-semibold text-white">{t("matches.difference.label")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-gpri">
                {t("matches.difference.points", { points: pointsDiff })}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("matches.difference.description")}</p>
            </div>
            <div className="rounded-lg border border-dark-600 bg-dark-900/50 p-4">
              <span className="text-2xl" aria-hidden>
                🎯
              </span>
              <p className="mt-2 font-semibold text-white">{t("matches.exact.label")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-gpri">
                {t("matches.exact.points", { points: pointsExact })}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("matches.exact.description")}</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-300">{t("matches.additive")}</p>
          <p className="mt-2 text-base font-bold text-gpri">
            {t("matches.maximum", { total: maxPerMatch })}
          </p>
        </section>

        {/* Section 2: Example + table + calculator */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("example.title")}</h2>
          <p className="mt-3 text-sm font-medium text-slate-200">
            <span aria-hidden>{getFlag(HOME_NAME)}</span> {HOME_NAME}{" "}
            <span className="tabular-nums text-gsec">
              {ACTUAL_HOME}-{ACTUAL_AWAY}
            </span>{" "}
            {AWAY_NAME} <span aria-hidden>{getFlag(AWAY_NAME)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("example.actualResultCaption")}</p>

          <div className="relative mt-6">
            <div className="overflow-x-auto">
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
                          ? "bg-gpri/10 shadow-[inset_4px_0_0_0_rgba(16,185,129,0.6)] ring-1 ring-inset ring-gpri/20"
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
                      <td className="py-2.5 pr-3 text-right font-mono font-bold tabular-nums text-gpri">
                        {b.total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-[#111720] to-transparent md:hidden"
              aria-hidden
            />
          </div>
          <p className="mt-2 text-center text-xs text-gray-500 md:hidden">{t("example.swipeHint")}</p>

          <div className="mt-8 rounded-xl border border-gpri/30 bg-dark-900/40 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white">{t("example.tryYourPrediction")}</h3>
            <p className="mt-2 text-xs text-slate-500">
              {t("example.fixedActual", { home: ACTUAL_HOME, away: ACTUAL_AWAY })}
            </p>
            <div className="mt-4 space-y-2">
              <span className="block text-sm text-slate-400">{t("example.yourPrediction")}</span>
              <div className="flex flex-row items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  value={predHomeStr}
                  onChange={(e) => setPredHomeStr(e.target.value.replace(/[^\d]/g, ""))}
                  aria-label={t("example.inputHomeAria")}
                />
                <span className="shrink-0 text-2xl text-gray-400" aria-hidden>
                  —
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  value={predAwayStr}
                  onChange={(e) => setPredAwayStr(e.target.value.replace(/[^\d]/g, ""))}
                  aria-label={t("example.inputAwayAria")}
                />
              </div>
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
                <li className="pt-2 font-semibold text-gpri">
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
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {pickCategories.map((row) => (
              <div
                key={row.key}
                className="rounded-lg border border-dark-600 bg-dark-900/50 p-4"
              >
                <p className="text-sm font-semibold text-white">{t(`picks.categories.${row.key}`)}</p>
                <p className="mt-2 font-mono text-lg font-bold text-gpri">
                  {t("picks.points", { points: row.points })}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-base font-bold text-gpri">
            {t("picks.maxBonus", { total: maxPickBonus })}
          </p>
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

        {/* Simulated P&L (analytics) */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("virtualTrader.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {t("virtualTrader.description", { tab: tv("tab.virtualBets") })}
          </p>
          <p className="mt-2 text-sm text-slate-500">{t("virtualTrader.disclaimer")}</p>
        </section>

        {/* Superpowers */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("superpowers.title")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <span className="text-2xl" aria-hidden>⚡</span>
              <p className="mt-2 font-semibold text-white">
                x2 Double Down
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({t("superpowers.uses", { count: powersDoubleDown })})
                </span>
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("superpowers.doubleDown")}</p>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
              <span className="text-2xl" aria-hidden>🔍</span>
              <p className="mt-2 font-semibold text-white">
                Spy
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({t("superpowers.uses", { count: powersSpy })})
                </span>
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("superpowers.spy")}</p>
            </div>
            <div className="rounded-lg border border-gpri/30 bg-gpri/5 p-4">
              <span className="text-2xl" aria-hidden>🛡️</span>
              <p className="mt-2 font-semibold text-white">
                Shield
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({t("superpowers.uses", { count: powersShield })})
                </span>
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-400">{t("superpowers.shield")}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">{t("superpowers.note")}</p>
        </section>

        {/* Sticker Album */}
        <section className="rounded-xl border border-dark-600 bg-[#111720] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{t("album.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("album.description")}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-4">
              <span className="text-2xl" aria-hidden>🥉</span>
              <p className="mt-2 font-semibold text-white">{t("album.bronze")}</p>
            </div>
            <div className="rounded-lg border border-gray-400/50 bg-gray-400/5 p-4">
              <span className="text-2xl" aria-hidden>🥈</span>
              <p className="mt-2 font-semibold text-white">{t("album.silver")}</p>
            </div>
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <span className="text-2xl" aria-hidden>🥇</span>
              <p className="mt-2 font-semibold text-white">{t("album.gold")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-300">{t("album.upgradeOnly")}</p>
          <p className="mt-2 text-xs text-slate-500">{t("album.compare")}</p>
        </section>

        {/* Admin Powers (only for admins) */}
        {isAdmin && (
          <section className="rounded-xl border border-amber-500/20 bg-[#111720] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">{t("adminPowers.title")}</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• {t("adminPowers.enterResults")}</li>
              <li>• {t("adminPowers.pendingPredictions")}</li>
              <li>• {t("adminPowers.accessCode")}</li>
              <li>• {t("adminPowers.reminders")}</li>
              <li>• {t("adminPowers.knockoutTeams")}</li>
              <li>• {t("adminPowers.deleteGroup")}</li>
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
