"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { formatMatchTime } from "@/lib/format-match-time";
import { useEffectiveTimeZone } from "@/lib/use-effective-timezone";
import type { MatchPhase, MatchStatus } from "@/types/supabase";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { teamFlags } from "@/lib/team-metadata";

const TEAM_OPTIONS = Object.keys(teamFlags).sort((a, b) => a.localeCompare(b));

export type SAMatch = {
  id: string;
  phase: MatchPhase;
  home_team: string;
  away_team: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  knockout_label: string | null;
  home_source: string | null;
  away_source: string | null;
  advancing_team: string | null;
};

type Props = {
  matches: SAMatch[];
  locale: string;
  profileTimeZone: string | null;
};

type ScoreInput = { home: string; away: string };

type Tab = "upcoming" | "finished" | "all";

function isKnockoutPhase(phase: MatchPhase): boolean {
  return phase !== "group";
}

function formatPhaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case "group":
      return "Group Stage";
    case "round_of_16":
      return "Round of 16";
    case "quarter":
    case "quarter_final":
      return "Quarter-finals";
    case "semi":
    case "semi_final":
      return "Semi-finals";
    case "third_place":
      return "Third place";
    case "final":
      return "Final";
    default:
      return phase;
  }
}

function statusBadge(status: MatchStatus) {
  if (status === "finished") return "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-700/50";
  if (status === "live") return "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50";
  return "bg-dark-700 text-slate-300 ring-1 ring-dark-500";
}

export default function MatchManagement({ matches, locale, profileTimeZone }: Props) {
  const t = useTranslations("SuperAdmin");
  const effectiveTz = useEffectiveTimeZone(profileTimeZone);
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("upcoming");
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [busyMatch, setBusyMatch] = useState<Record<string, boolean>>({});
  const [advancingByMatch, setAdvancingByMatch] = useState<Record<string, string>>({});
  const [resolveOpenFor, setResolveOpenFor] = useState<string | null>(null);
  const [resolveHome, setResolveHome] = useState("");
  const [resolveAway, setResolveAway] = useState("");
  const [resolveSaving, setResolveSaving] = useState<string | null>(null);

  const formatWhen = useMemo(
    () => (iso: string) => formatMatchTime(iso, effectiveTz, locale),
    [effectiveTz, locale],
  );

  const filtered = useMemo(() => {
    if (tab === "upcoming") return matches.filter((m) => m.status !== "finished");
    if (tab === "finished") return matches.filter((m) => m.status === "finished").reverse();
    return [...matches];
  }, [matches, tab]);

  function getInput(m: SAMatch): ScoreInput {
    return scores[m.id] ?? {
      home: m.home_score != null ? String(m.home_score) : "",
      away: m.away_score != null ? String(m.away_score) : "",
    };
  }

  function setScore(m: SAMatch, key: "home" | "away", val: string) {
    if (val.startsWith("-")) return;
    const prev = scores[m.id];
    const next: ScoreInput = {
      home: key === "home" ? val : (prev?.home ?? (m.home_score != null ? String(m.home_score) : "")),
      away: key === "away" ? val : (prev?.away ?? (m.away_score != null ? String(m.away_score) : "")),
    };
    setScores((s) => ({ ...s, [m.id]: next }));

    if (!isKnockoutPhase(m.phase)) return;
    const nh = Number(next.home);
    const na = Number(next.away);
    if (next.home !== "" && next.away !== "" && Number.isInteger(nh) && Number.isInteger(na) && nh >= 0 && na >= 0) {
      if (nh !== na) {
        setAdvancingByMatch((p) => ({ ...p, [m.id]: nh > na ? m.home_team : m.away_team }));
      } else {
        setAdvancingByMatch((p) => ({ ...p, [m.id]: "" }));
      }
    }
  }

  function effectiveAdv(m: SAMatch, inp: ScoreInput): string {
    const pick = (advancingByMatch[m.id] ?? "").trim();
    const h = Number(inp.home);
    const a = Number(inp.away);
    if (inp.home === "" || inp.away === "" || !Number.isInteger(h) || !Number.isInteger(a)) return pick;
    if (h !== a) {
      if (pick === m.home_team || pick === m.away_team) return pick;
      return h > a ? m.home_team : m.away_team;
    }
    return pick;
  }

  async function markFinished(m: SAMatch) {
    const inp = getInput(m);
    const hs = Number(inp.home);
    const as_ = Number(inp.away);
    if (!Number.isInteger(hs) || !Number.isInteger(as_) || hs < 0 || as_ < 0) {
      showToast("Enter valid scores", "error");
      return;
    }

    let advPayload: { advancing_team: string | null } | Record<string, never> = {};
    if (isKnockoutPhase(m.phase)) {
      const adv = effectiveAdv(m, inp).trim();
      if (!adv || (adv !== m.home_team && adv !== m.away_team)) {
        showToast(t("knockout.selectAdvancing"), "error");
        return;
      }
      advPayload = { advancing_team: adv };
    }

    const ok = window.confirm(
      `Mark ${m.home_team} vs ${m.away_team} as finished with score ${hs}-${as_}?`,
    );
    if (!ok) return;

    setBusyMatch((p) => ({ ...p, [m.id]: true }));
    try {
      const { error } = await supabase
        .from("matches")
        .update({ home_score: hs, away_score: as_, status: "finished" as MatchStatus, ...advPayload })
        .eq("id", m.id);
      if (error) {
        showToast("Error updating match", "error");
        return;
      }

      await supabase.auth.refreshSession();
      const { data: scoreData, error: scoreError } = await supabase.functions.invoke("score-match", {
        body: { match_id: m.id },
      });

      if (scoreError) {
        showToast("Match saved but scoring failed", "error");
      } else {
        const scored = (scoreData as { scored?: number })?.scored ?? 0;
        const groups = (scoreData as { groups_updated?: number })?.groups_updated ?? 0;
        showToast(t("matches.scoredSummary", { predictions: scored, groups }), "success");
      }
      router.refresh();
    } finally {
      setBusyMatch((p) => ({ ...p, [m.id]: false }));
    }
  }

  async function rescore(m: SAMatch) {
    setBusyMatch((p) => ({ ...p, [m.id]: true }));
    try {
      await supabase.auth.refreshSession();
      const { data: scoreData, error: scoreError } = await supabase.functions.invoke("score-match", {
        body: { match_id: m.id },
      });
      if (scoreError) {
        showToast("Rescore failed", "error");
      } else {
        const scored = (scoreData as { scored?: number })?.scored ?? 0;
        const groups = (scoreData as { groups_updated?: number })?.groups_updated ?? 0;
        showToast(t("matches.scoredSummary", { predictions: scored, groups }), "success");
      }
      router.refresh();
    } finally {
      setBusyMatch((p) => ({ ...p, [m.id]: false }));
    }
  }

  async function resetMatch(m: SAMatch) {
    const ok = window.confirm(t("matches.resetConfirm"));
    if (!ok) return;

    setBusyMatch((p) => ({ ...p, [m.id]: true }));
    try {
      await supabase
        .from("matches")
        .update({
          home_score: null,
          away_score: null,
          status: "scheduled" as MatchStatus,
          advancing_team: null,
        })
        .eq("id", m.id);
      router.refresh();
    } finally {
      setBusyMatch((p) => ({ ...p, [m.id]: false }));
    }
  }

  function openResolve(m: SAMatch) {
    setResolveOpenFor(m.id);
    setResolveHome(m.home_team !== "TBD" ? m.home_team : "");
    setResolveAway(m.away_team !== "TBD" ? m.away_team : "");
  }

  async function submitResolve(m: SAMatch) {
    const h = resolveHome.trim();
    const a = resolveAway.trim();
    if (!h || !a) return;
    setResolveSaving(m.id);
    const { error } = await supabase.rpc("resolve_knockout_match", {
      p_match_id: m.id,
      p_home_team: h,
      p_away_team: a,
    });
    setResolveSaving(null);
    if (error) {
      showToast("Error resolving teams", "error");
      return;
    }
    showToast(t("knockout.resolved"), "success");
    setResolveOpenFor(null);
    router.refresh();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: t("matches.upcoming") },
    { key: "finished", label: t("matches.finished") },
    { key: "all", label: t("matches.all") },
  ];

  return (
    <section className="rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">{t("matches.title")}</h2>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === tb.key
                ? "bg-emerald-600 text-white"
                : "bg-dark-700 text-slate-300 hover:bg-dark-600"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <QuickActionButton label={t("actions.sendReminders")} onClick={async () => {
          await supabase.auth.refreshSession();
          const { error } = await supabase.functions.invoke("send-prediction-reminders");
          showToast(error ? "Error" : "Reminders sent", error ? "error" : "success");
        }} />
        <span className="inline-flex items-center rounded-lg bg-dark-700 px-3 py-1.5 text-xs text-slate-500">
          {t("actions.updateOdds")}
        </span>
        <span className="inline-flex items-center rounded-lg bg-dark-700 px-3 py-1.5 text-xs text-slate-500">
          {t("actions.exportData")}
        </span>
      </div>

      {/* Match list */}
      <div className="mt-5 space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">{t("matches.noMatches")}</p>
        )}
        {filtered.map((m) => {
          const inp = getInput(m);
          const isFinished = m.status === "finished";
          const busy = busyMatch[m.id] === true;
          const needsTbd = m.home_team === "TBD" || m.away_team === "TBD";
          const adv = effectiveAdv(m, inp);
          const hSc = Number(inp.home);
          const aSc = Number(inp.away);
          const isDraw =
            inp.home !== "" && inp.away !== "" && Number.isInteger(hSc) && Number.isInteger(aSc) && hSc === aSc;

          return (
            <div key={m.id} className="rounded-lg border border-dark-600 bg-dark-700/50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatPhaseLabel(m.phase)}
                    {m.knockout_label ? ` · ${m.knockout_label}` : ""}
                  </p>
                  <p className="mt-1 font-medium text-white">
                    {teamFlags[m.home_team] ?? ""} {m.home_team} vs {m.away_team} {teamFlags[m.away_team] ?? ""}
                  </p>
                  {isKnockoutPhase(m.phase) && m.home_source && (
                    <p className="text-xs text-slate-500">
                      {m.home_source} vs {m.away_source}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">{formatWhen(m.match_time)}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(m.status)}`}>
                  {m.status}
                </span>
              </div>

              {/* TBD resolution for knockout */}
              {needsTbd && !isFinished && (
                <div className="mt-3 border-t border-dark-600 pt-3">
                  {resolveOpenFor === m.id ? (
                    <div className="flex flex-col gap-2">
                      <label className="block text-xs text-slate-300">
                        {t("knockout.homeTeam")}
                        <select
                          value={resolveHome}
                          onChange={(e) => setResolveHome(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-sm text-white"
                        >
                          <option value="">{t("knockout.pickTeam")}</option>
                          {TEAM_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs text-slate-300">
                        {t("knockout.awayTeam")}
                        <select
                          value={resolveAway}
                          onChange={(e) => setResolveAway(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-sm text-white"
                        >
                          <option value="">{t("knockout.pickTeam")}</option>
                          {TEAM_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={resolveSaving === m.id}
                          onClick={() => void submitResolve(m)}
                          className={`rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                        >
                          {t("knockout.saveTeams")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResolveOpenFor(null)}
                          className="rounded-lg border border-dark-500 px-3 py-2 text-sm text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openResolve(m)}
                      className={`rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 ${PRIMARY_BUTTON_CLASSES}`}
                    >
                      {t("knockout.resolveTeams")}
                    </button>
                  )}
                </div>
              )}

              {/* Finished: show score + rescore/reset */}
              {isFinished && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-dark-600 pt-3">
                  <p className="text-base font-semibold text-emerald-400">
                    {m.home_score ?? 0} - {m.away_score ?? 0}
                    {m.advancing_team && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        → {m.advancing_team}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void rescore(m)}
                    className={`rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                  >
                    {busy ? "..." : t("matches.rescore")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void resetMatch(m)}
                    className={`rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                  >
                    {t("matches.reset")}
                  </button>
                </div>
              )}

              {/* Scheduled: score inputs */}
              {!isFinished && !needsTbd && (
                <div className="mt-3 flex flex-col gap-3 border-t border-dark-600 pt-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={inp.home}
                      onChange={(e) => setScore(m, "home", e.target.value)}
                      className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      aria-label="Home score"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={inp.away}
                      onChange={(e) => setScore(m, "away", e.target.value)}
                      className="w-20 rounded-lg border border-dark-500 bg-dark-900 px-2 py-2 text-center text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      aria-label="Away score"
                    />
                  </div>

                  {/* Knockout advancing selector */}
                  {isKnockoutPhase(m.phase) && (
                    <div>
                      <p className="text-xs text-slate-400">{t("knockout.advancingTeam")}</p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setAdvancingByMatch((p) => ({ ...p, [m.id]: m.home_team }))}
                          className={`min-h-[40px] flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            adv === m.home_team
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-500/40"
                              : "border-dark-500 bg-dark-900 text-slate-200 hover:border-emerald-500/40"
                          }`}
                        >
                          {m.home_team}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvancingByMatch((p) => ({ ...p, [m.id]: m.away_team }))}
                          className={`min-h-[40px] flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            adv === m.away_team
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-500/40"
                              : "border-dark-500 bg-dark-900 text-slate-200 hover:border-emerald-500/40"
                          }`}
                        >
                          {m.away_team}
                        </button>
                      </div>
                      {isDraw && (
                        <p className="mt-1 text-[10px] text-amber-400/90">{t("knockout.drawPickAdvancing")}</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markFinished(m)}
                    className={`inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
                  >
                    {busy ? "..." : t("matches.markFinished")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuickActionButton({ label, onClick }: { label: string; onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await onClick(); } finally { setBusy(false); }
      }}
      className={`rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
    >
      {busy ? "..." : label}
    </button>
  );
}
