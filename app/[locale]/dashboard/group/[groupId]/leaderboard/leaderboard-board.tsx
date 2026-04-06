"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import RankingSnapshotShareButton from "@/components/share/ranking-snapshot";
import { AI_PLAYER_ID } from "@/lib/constants";

export type LeaderboardBoardRow = {
  user_id: string;
  rank: number | null;
  total_points: number;
  correct_results: number;
  exact_scores: number;
  predictions_made: number;
  virtual_pnl: number;
  virtual_bets_won: number;
  virtual_bets_lost: number;
  display_name: string;
};

type Props = {
  groupName: string;
  locale: string;
  currentUserId: string;
  rows: LeaderboardBoardRow[];
};

type Tab = "points" | "pnl";

function formatPnlLabel(pnl: number, t: ReturnType<typeof useTranslations<"VirtualBets">>) {
  const v = parseFloat(Number(pnl).toFixed(2));
  if (v > 0) return t("profit", { amount: v.toFixed(2) });
  if (v < 0) return t("loss", { amount: Math.abs(v).toFixed(2) });
  return t("profit", { amount: "0.00" });
}

export default function LeaderboardBoard({ groupName, locale, currentUserId, rows }: Props) {
  const t = useTranslations("Leaderboard");
  const tv = useTranslations("VirtualBets");
  const [tab, setTab] = useState<Tab>("points");

  const pnlRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const dp = b.virtual_pnl - a.virtual_pnl;
      if (dp !== 0) return dp;
      return b.virtual_bets_won - a.virtual_bets_won;
    });
    return sorted.map((r, i) => ({ ...r, pnl_rank: i + 1 }));
  }, [rows]);

  const anyVirtualBets = useMemo(
    () => rows.some((r) => r.virtual_bets_won + r.virtual_bets_lost > 0),
    [rows]
  );

  return (
    <>
      <div className="mt-6 inline-flex rounded-full border border-dark-600 bg-dark-900/50 p-1">
        <button
          type="button"
          onClick={() => setTab("points")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "points"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tv("tab.points")}
        </button>
        <button
          type="button"
          onClick={() => setTab("pnl")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "pnl"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tv("tab.virtualBets")}
        </button>
      </div>

      {tab === "points" && rows.length > 0 ? (
        <div className="mt-4">
          <RankingSnapshotShareButton
            groupName={groupName}
            locale={locale}
            rankings={rows.slice(0, 5).map((r, i) => ({
              rank: r.rank ?? i + 1,
              name: r.display_name,
              points: r.total_points,
            }))}
          />
        </div>
      ) : null}

      {tab === "pnl" ? (
        <p className="mt-4 text-xs text-slate-500 bg-gray-800/50 rounded px-3 py-2 text-center">
          {tv("disclaimer")}
        </p>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-dark-600">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            {tab === "points" ? (
              <tr className="border-b border-dark-600 bg-dark-700 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="whitespace-nowrap py-3 pl-4 pr-4">{t("colRank")}</th>
                <th className="whitespace-nowrap py-3 pr-4">{t("colName")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colPoints")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colCorrectResults")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colExactScores")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colPredictionsMade")}</th>
              </tr>
            ) : (
              <tr className="border-b border-dark-600 bg-dark-700 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="whitespace-nowrap py-3 pl-4 pr-4">{t("colRank")}</th>
                <th className="whitespace-nowrap py-3 pr-4">{t("colName")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{tv("pnl")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{tv("colRecord")}</th>
                <th className="whitespace-nowrap py-3 pr-4 text-right">{tv("colWinRate")}</th>
              </tr>
            )}
          </thead>
          <tbody>
            {tab === "points"
              ? rows.map((row, index) => {
                  const isAI = row.user_id === AI_PLAYER_ID;
                  const isSelf = !isAI && row.user_id === currentUserId;
                  const r = row.rank;
                  const topThree = r != null && r >= 1 && r <= 3;
                  const medal = r === 1 ? "🥇 " : r === 2 ? "🥈 " : r === 3 ? "🥉 " : "";
                  const tierBorder = isAI
                    ? "border-l-4 border-purple-500"
                    : r === 1
                      ? "border-l-4 border-yellow-400"
                      : r === 2
                        ? "border-l-4 border-slate-300"
                        : r === 3
                          ? "border-l-4 border-amber-600"
                          : "";
                  const selfBorder = isSelf && !topThree ? "border-l-4 border-l-emerald-500" : "";
                  const rowBg = isSelf ? "bg-emerald-900/20 ring-1 ring-inset ring-emerald-500/30" : "";
                  return (
                    <tr
                      key={row.user_id}
                      style={{ animationDelay: `${Math.min(index * 80, 500)}ms` }}
                      className={["animate-page-in border-b border-dark-600", tierBorder, selfBorder, rowBg]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td
                        className={`whitespace-nowrap py-3 pl-4 pr-4 font-medium ${
                          topThree ? "text-gold" : "text-slate-200"
                        }`}
                      >
                        <span aria-hidden>{medal}</span>
                        {row.rank ?? "—"}
                        {isSelf ? (
                          <span className="ml-2 rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-700/50">
                            {t("youBadge")}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {row.display_name}
                        {isAI ? (
                          <span className="ml-1.5 rounded bg-purple-500/20 px-1.5 py-0.5 text-xs font-medium text-purple-400">
                            IA
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums font-bold text-emerald-400">
                        {row.total_points}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-400">
                        {row.correct_results}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-400">{row.exact_scores}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-400">
                        {row.predictions_made}
                      </td>
                    </tr>
                  );
                })
              : pnlRows.map((row, index) => {
                  const isAI = row.user_id === AI_PLAYER_ID;
                  const isSelf = !isAI && row.user_id === currentUserId;
                  const pr = row.pnl_rank;
                  const topThree = pr >= 1 && pr <= 3;
                  const medal = pr === 1 ? "🥇 " : pr === 2 ? "🥈 " : pr === 3 ? "🥉 " : "";
                  const pnlVal = parseFloat(Number(row.virtual_pnl).toFixed(2));
                  const pnlPositive = pnlVal > 0;
                  const pnlNegative = pnlVal < 0;
                  const pnlBorder = isAI
                    ? "border-l-4 border-purple-500"
                    : pnlPositive
                      ? "border-l-2 border-emerald-500"
                      : pnlNegative
                        ? "border-l-2 border-red-500"
                        : "";
                  const rowBg = isSelf ? "bg-emerald-900/20 ring-1 ring-inset ring-emerald-500/30" : "";
                  const won = row.virtual_bets_won;
                  const lost = row.virtual_bets_lost;
                  const totalBets = won + lost;
                  const winRateStr =
                    totalBets > 0 ? tv("winRate", { rate: Math.round((won / totalBets) * 100) }) : "—";

                  return (
                    <tr
                      key={row.user_id}
                      style={{ animationDelay: `${Math.min(index * 80, 500)}ms` }}
                      className={["animate-page-in border-b border-dark-600", pnlBorder, rowBg]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td className={`whitespace-nowrap py-3 pl-4 pr-4 font-medium ${topThree ? "text-gold" : "text-slate-200"}`}>
                        <span aria-hidden>{medal}</span>
                        {pr}
                        {isSelf ? (
                          <span className="ml-2 rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-700/50">
                            {t("youBadge")}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {row.display_name}
                        {isAI ? (
                          <span className="ml-1.5 rounded bg-purple-500/20 px-1.5 py-0.5 text-xs font-medium text-purple-400">
                            IA
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`py-3 pr-4 text-right font-mono tabular-nums font-bold ${
                          pnlPositive ? "text-emerald-400" : pnlNegative ? "text-red-400" : "text-slate-300"
                        }`}
                      >
                        {formatPnlLabel(row.virtual_pnl, tv)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-400">
                        {totalBets > 0 ? tv("record", { won, lost }) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-500">{winRateStr}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {tab === "pnl" && !anyVirtualBets ? (
        <p className="mt-4 text-center text-sm text-slate-500">{tv("noBets")}</p>
      ) : null}
    </>
  );
}
