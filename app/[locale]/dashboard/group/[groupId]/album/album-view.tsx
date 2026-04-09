"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { teamFlags, teamGroup } from "@/lib/team-metadata";

type Tier = "bronze" | "silver" | "gold";
type StickerData = { team: string; tier: Tier; matchId: string | null };
type MatchLabel = { id: string; home_team: string; away_team: string };
type GroupMember = { userId: string; displayName: string };

type Props = {
  locale: string;
  groupId: string;
  groupName: string;
  stickers: StickerData[];
  matchLabels: MatchLabel[];
  groupMembers: GroupMember[];
};

const ALL_TEAMS = Object.keys(teamFlags);
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function AlbumView({
  locale,
  groupId,
  groupName,
  stickers,
  matchLabels,
  groupMembers,
}: Props) {
  const t = useTranslations("Album");
  const common = useTranslations("Common");

  const stickerMap = useMemo(() => {
    const m = new Map<string, StickerData>();
    for (const s of stickers) m.set(s.team, s);
    return m;
  }, [stickers]);

  const matchMap = useMemo(() => {
    const m = new Map<string, MatchLabel>();
    for (const ml of matchLabels) m.set(ml.id, ml);
    return m;
  }, [matchLabels]);

  const stats = useMemo(() => {
    let gold = 0, silver = 0, bronze = 0;
    for (const s of stickers) {
      if (s.tier === "gold") gold++;
      else if (s.tier === "silver") silver++;
      else bronze++;
    }
    return { collected: stickers.length, gold, silver, bronze };
  }, [stickers]);

  const teamsByGroup = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const team of ALL_TEAMS) {
      const g = teamGroup[team] ?? "?";
      (map[g] ??= []).push(team);
    }
    return map;
  }, []);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareUserId, setCompareUserId] = useState<string | null>(null);
  const [compareStickers, setCompareStickers] = useState<Map<string, StickerData>>(new Map());
  const [compareLoading, setCompareLoading] = useState(false);

  const fetchCompare = useCallback(
    async (userId: string) => {
      setCompareLoading(true);
      try {
        const res = await fetch(`./album/compare?userId=${userId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { stickers: StickerData[] };
        const m = new Map<string, StickerData>();
        for (const s of data.stickers) m.set(s.team, s);
        setCompareStickers(m);
      } finally {
        setCompareLoading(false);
      }
    },
    [],
  );

  /** Team whose detail modal is open (portaled to body; true viewport center). */
  const [detailTeam, setDetailTeam] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!detailTeam) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailTeam]);

  function matchLabel(matchId: string | null) {
    if (!matchId) return "";
    const ml = matchMap.get(matchId);
    if (!ml) return "";
    return `${ml.home_team} vs ${ml.away_team}`;
  }

  function tierEmoji(tier: Tier) {
    return tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉";
  }

  function handleCardClick(team: string) {
    setDetailTeam((prev) => (prev === team ? null : team));
  }

  const pct = Math.round((stats.collected / 48) * 100);

  const modal =
    portalReady && detailTeam ? (
      createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailTeam(null)}
          role="presentation"
        >
          <div
            className="relative mx-4 w-full max-w-xs rounded-xl border border-gray-700 bg-[#111720] p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="album-sticker-detail-title"
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-lg leading-none text-slate-400 transition hover:bg-white/10 hover:text-white"
              onClick={() => setDetailTeam(null)}
              aria-label={t("closeModal")}
            >
              ✕
            </button>

            {(() => {
              const sticker = stickerMap.get(detailTeam);
              const flag = teamFlags[detailTeam] ?? "⚽";
              if (sticker) {
                return (
                  <>
                    <span className="text-6xl leading-none" aria-hidden>
                      {flag}
                    </span>
                    <h2 id="album-sticker-detail-title" className="mt-3 text-lg font-bold text-white">
                      {detailTeam}
                    </h2>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {tierEmoji(sticker.tier)} {t(`tiers.${sticker.tier}`)}
                      {" — "}
                      {t(`${sticker.tier}Description`)}
                    </p>
                    {sticker.matchId ? (
                      <p className="mt-3 text-sm text-slate-400">
                        {t("earnedFrom", { match: matchLabel(sticker.matchId) })}
                      </p>
                    ) : null}
                  </>
                );
              }
              return (
                <>
                  <span className="text-6xl leading-none opacity-40 grayscale" aria-hidden>
                    {flag}
                  </span>
                  <h2 id="album-sticker-detail-title" className="mt-3 text-lg font-bold text-gray-500">
                    {detailTeam}
                  </h2>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {t("locked")}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    {t("lockedHint", { team: detailTeam })}
                  </p>
                </>
              );
            })()}
          </div>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <>
      <main className="animate-page-in min-h-screen bg-[#0A0E14] px-4 py-8">
        <div className="mx-auto w-full max-w-4xl">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-gpri hover:text-gpri/90"
        >
          {common("backToGroup", { groupName })}
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-white">{t("title")}</h1>

        {/* Progress */}
        <div className="mt-4 rounded-xl border border-dark-600 bg-[#111720] p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-bold text-white">{pct}%</span>
            <span className="text-slate-400">
              {t("progress", { count: stats.collected })}
            </span>
            <span className="text-yellow-400">{stats.gold} 🥇</span>
            <span className="text-gray-300">{stats.silver} 🥈</span>
            <span className="text-amber-600">{stats.bronze} 🥉</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-700">
            <div
              className="sticker-progress-bar h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Compare toggle */}
        {groupMembers.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCompareMode(false);
                setCompareUserId(null);
                setCompareStickers(new Map());
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !compareMode
                  ? "bg-gpri/20 text-gpri border border-gpri"
                  : "bg-[#1a2332] text-gray-400 border border-gray-700"
              }`}
            >
              {t("compare.myAlbum")}
            </button>
            <button
              type="button"
              onClick={() => setCompareMode(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                compareMode
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500"
                  : "bg-[#1a2332] text-gray-400 border border-gray-700"
              }`}
            >
              {t("compare.title")}
            </button>
            {compareMode && (
              <select
                className="rounded-lg border border-dark-500 bg-dark-900 px-3 py-1.5 text-xs text-white outline-none"
                value={compareUserId ?? ""}
                onChange={(e) => {
                  const uid = e.target.value;
                  setCompareUserId(uid || null);
                  if (uid) void fetchCompare(uid);
                }}
              >
                <option value="">{t("compare.selectPlayer")}</option>
                {groupMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Album grid */}
        <div className="mt-6 space-y-8">
          {GROUP_LETTERS.map((letter) => {
            const teams = teamsByGroup[letter] ?? [];
            return (
              <section key={letter}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("group", { letter })}
                </h2>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {teams.map((team) => {
                    const sticker = stickerMap.get(team);
                    const otherSticker = compareMode && compareUserId ? compareStickers.get(team) : null;
                    const hasIt = !!sticker;
                    const otherHasIt = !!otherSticker;

                    let compareBorder = "";
                    if (compareMode && compareUserId && !compareLoading) {
                      if (otherHasIt && !hasIt) compareBorder = "ring-2 ring-blue-500/60";
                      else if (hasIt && !otherHasIt) compareBorder = "ring-2 ring-gpri/60";
                    }

                    return (
                      <button
                        key={team}
                        type="button"
                        onClick={() => handleCardClick(team)}
                        className={`sticker-card relative flex flex-col items-center justify-center rounded-xl p-2 sm:p-3 transition-all duration-200 ${compareBorder} ${
                          hasIt
                            ? sticker.tier === "gold"
                              ? "sticker-gold border border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-[#111720] shadow-lg shadow-yellow-500/20"
                              : sticker.tier === "silver"
                                ? "sticker-silver border border-gray-400/50 bg-gradient-to-b from-gray-400/10 to-[#111720]"
                                : "sticker-bronze border border-amber-800/50 bg-gradient-to-b from-amber-900/20 to-[#111720]"
                            : "border border-gray-800 bg-[#111720]"
                        }`}
                      >
                        {hasIt && (
                          <span className="absolute right-1 top-1 text-xs sm:text-sm">
                            {tierEmoji(sticker.tier)}
                          </span>
                        )}
                        <span
                          className={`text-3xl sm:text-4xl leading-none ${
                            hasIt ? "" : "opacity-20 grayscale"
                          }`}
                          style={hasIt ? undefined : { filter: "grayscale(1)" }}
                        >
                          {teamFlags[team] ?? "⚽"}
                        </span>
                        <span
                          className={`mt-1.5 text-center text-[10px] sm:text-xs leading-tight ${
                            hasIt
                              ? sticker.tier === "gold"
                                ? "font-bold text-white"
                                : sticker.tier === "silver"
                                  ? "font-bold text-white"
                                  : "text-white"
                              : "text-gray-600"
                          }`}
                        >
                          {team}
                        </span>
                        {compareMode && otherSticker && (
                          <span className="mt-0.5 text-[9px] text-blue-400">
                            {tierEmoji(otherSticker.tier)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        </div>
      </main>
      {modal}
    </>
  );
}
