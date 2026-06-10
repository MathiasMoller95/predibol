import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { createClient } from "@/lib/supabase/server";
import { dayKeyInTz } from "@/lib/date-in-tz";
import { formatDurationMs } from "@/lib/format-duration-ms";
import { DEFAULT_TIMEZONE } from "@/lib/format-match-time";
import DashboardGroupList, { type GroupSummary } from "./dashboard-group-list";

const WORLD_CUP_KICKOFF_UTC = Date.UTC(2026, 5, 11, 19, 0, 0);

type Props = {
  params: { locale: string };
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profileRow } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const profileTimeZone = ((profileRow?.timezone as string | undefined) ?? "").trim() || null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberships ?? []).map((row) => row.group_id as string);

  let groups: Array<{
    id: string;
    name: string;
    primary_color: string | null;
    logo_url: string | null;
  }> = [];

  let memberCounts: Record<string, number> = {};
  const leaderboardByGroup: Record<string, { rank: number | null; total_points: number }> = {};
  let predictionCountByGroup: Record<string, number> = {};
  let predictedGroupsForNextMatch = new Set<string>();

  const nowIso = new Date().toISOString();
  const [nextMatchResult, totalMatchesResult, matchesRemainingResult] = await Promise.all([
    supabase
      .from("matches")
      .select("id,home_team,away_team,match_time,status,locked_at")
      .eq("status", "scheduled")
      .gt("match_time", nowIso)
      .order("match_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "live"]),
  ]);

  const nextMatch = nextMatchResult.data;
  const totalMatchCount = totalMatchesResult.count ?? 0;
  const matchesRemainingCount = matchesRemainingResult.count ?? 0;

  if (groupIds.length > 0) {
    const [{ data: groupRows }, { data: leaderboardRows }, { data: userPredictionRows }] = await Promise.all([
      supabase.from("groups").select("id,name,primary_color,logo_url").in("id", groupIds),
      supabase
        .from("leaderboard")
        .select("group_id,rank,total_points")
        .eq("user_id", user.id)
        .in("group_id", groupIds),
      supabase.from("predictions").select("group_id").eq("user_id", user.id).in("group_id", groupIds),
    ]);

    groups = (groupRows ?? []) as typeof groups;
    (leaderboardRows ?? []).forEach((row) => {
      leaderboardByGroup[row.group_id as string] = {
        rank: (row.rank as number | null) ?? null,
        total_points: (row.total_points as number) ?? 0,
      };
    });

    predictionCountByGroup = {};
    for (const row of userPredictionRows ?? []) {
      const gid = row.group_id as string;
      predictionCountByGroup[gid] = (predictionCountByGroup[gid] ?? 0) + 1;
    }

    const countPairs = await Promise.all(
      groupIds.map(async (groupId) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", groupId);
        return [groupId, count ?? 0] as const;
      }),
    );
    memberCounts = Object.fromEntries(countPairs);

    if (nextMatch?.id) {
      const { data: predictionRows } = await supabase
        .from("predictions")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("match_id", nextMatch.id as string)
        .in("group_id", groupIds);

      predictedGroupsForNextMatch = new Set((predictionRows ?? []).map((row) => row.group_id as string));
    }
  }

  const summaries: GroupSummary[] = groups
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => {
      const lb = leaderboardByGroup[group.id];
      const totalMembers = memberCounts[group.id] ?? 0;

      return {
        id: group.id,
        name: group.name,
        primaryColor: group.primary_color,
        logoUrl: group.logo_url,
        totalMembers,
        rank: lb?.rank ?? null,
        points: lb?.total_points ?? 0,
        predictionsSubmitted: predictionCountByGroup[group.id] ?? 0,
        totalMatches: totalMatchCount,
        nextMatch: nextMatch
          ? {
              id: nextMatch.id as string,
              homeTeam: nextMatch.home_team as string,
              awayTeam: nextMatch.away_team as string,
              matchTime: nextMatch.match_time as string,
            }
          : null,
        hasPredictionForNextMatch: nextMatch ? predictedGroupsForNextMatch.has(group.id) : false,
      };
    });

  const nowMs = Date.now();
  const beforeWorldCup = nowMs < WORLD_CUP_KICKOFF_UTC;
  const worldCupDays = Math.max(
    1,
    Math.ceil((WORLD_CUP_KICKOFF_UTC - nowMs) / 86_400_000),
  );

  const effectiveTz = (profileTimeZone ?? "").trim() || DEFAULT_TIMEZONE;
  const todayKey = dayKeyInTz(new Date().toISOString(), effectiveTz);
  const fortnightAhead = new Date(Date.now() + 14 * 86_400_000).toISOString();

  type MatchDayUI =
    | {
        variant: "urgent";
        targetGroupId: string;
        locksInFormatted: string;
        todayMatchCount: number;
        missingCount: number;
      }
    | { variant: "allSet"; todayMatchCount: number };

  let matchDayBanner: MatchDayUI | null = null;

  if (groupIds.length > 0) {
    const { data: scheduledWindow } = await supabase
      .from("matches")
      .select("id, match_time, locked_at")
      .eq("status", "scheduled")
      .gt("locked_at", nowIso)
      .lte("match_time", fortnightAhead);

    const todayMatches = ((scheduledWindow ?? []) as { id: string; match_time: string; locked_at: string }[])
      .filter((m) => dayKeyInTz(m.match_time, effectiveTz) === todayKey);

    if (todayMatches.length > 0) {
      const todayIds = todayMatches.map((m) => m.id);
      const lockByMid = new Map(todayMatches.map((m) => [m.id, new Date(m.locked_at).getTime()]));

      const { data: predRowsRaw } = await supabase
        .from("predictions")
        .select("group_id, match_id")
        .eq("user_id", user.id)
        .in("group_id", groupIds)
        .in("match_id", todayIds);

      const predictedSet = new Set(
        (predRowsRaw ?? []).map((r) => `${r.group_id as string}|${r.match_id as string}`),
      );

      const missingPairs: { gid: string; mid: string }[] = [];
      const missingPerGroup = new Map<string, number>();
      for (const gid of groupIds) missingPerGroup.set(gid, 0);

      let missingTotal = 0;
      for (const gid of groupIds) {
        for (const mid of todayIds) {
          const k = `${gid}|${mid}`;
          if (!predictedSet.has(k)) {
            missingTotal += 1;
            missingPairs.push({ gid, mid });
            missingPerGroup.set(gid, (missingPerGroup.get(gid) ?? 0) + 1);
          }
        }
      }

      let minLockGapMs: number | null = null;
      for (const { mid } of missingPairs) {
        const tLock = lockByMid.get(mid);
        if (tLock == null) continue;
        const ms = tLock - nowMs;
        if (ms > 0 && (minLockGapMs === null || ms < minLockGapMs)) minLockGapMs = ms;
      }

      if (missingTotal > 0) {
        const sortedGroups = [...groupIds].sort();
        let bestG = sortedGroups[0]!;
        let bestMiss = missingPerGroup.get(bestG) ?? 0;
        for (const gid of sortedGroups) {
          const mCount = missingPerGroup.get(gid) ?? 0;
          if (mCount > bestMiss) {
            bestMiss = mCount;
            bestG = gid;
          }
        }
        matchDayBanner = {
          variant: "urgent",
          targetGroupId: bestG,
          locksInFormatted: minLockGapMs != null && minLockGapMs > 0 ? formatDurationMs(minLockGapMs) : "—",
          todayMatchCount: todayMatches.length,
          missingCount: missingTotal,
        };
      } else {
        matchDayBanner = {
          variant: "allSet",
          todayMatchCount: todayMatches.length,
        };
      }
    }
  }

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 pb-8 pt-4 sm:pt-6 sm:pb-8">
      <section className="mx-auto w-full max-w-6xl rounded-xl border border-dark-600 bg-dark-800 px-4 pt-4 pb-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="landing-wc26-text font-semibold">{t("subtitleFifa")}</span>
              <span className="text-slate-500" aria-hidden>
                🇺🇸🇨🇦🇲🇽 ⚽
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/${locale}/dashboard/discover`}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-dark-500 bg-dark-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-dark-600 active:scale-[0.97]"
            >
              {t("discoverWorlds")}
            </a>
            <a
              href={`/${locale}/dashboard/create-group`}
              className={`inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("createGroup")}
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          {beforeWorldCup ? t("worldCupCountdown", { days: worldCupDays }) : t("worldCupLive")}
        </p>

        <p className="mt-2 text-center text-xs text-slate-500">
          {t("matchesRemaining", { count: matchesRemainingCount })}
        </p>

        {matchDayBanner && matchDayBanner.variant === "urgent" ? (
          <Link
            href={`/${locale}/dashboard/group/${matchDayBanner.targetGroupId}/predict`}
            className="mt-6 block rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm leading-relaxed text-red-50/95 transition hover:bg-red-500/15 hover:brightness-105 active:scale-[0.995]"
            aria-label={t("matchDayUrgentAria")}
          >
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1.5 align-middle">
              <span className="inline-flex shrink-0 items-center gap-2 font-semibold text-red-200">
                <span className="inline-block size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
                <span>{t("matchDayToday")}</span>
              </span>
              <span className="text-red-400/75" aria-hidden>
                —
              </span>
              <span>{t("matchDayMatchesShort", { count: matchDayBanner.todayMatchCount })}</span>
              <span className="text-red-400/75" aria-hidden>
                ·
              </span>
              <span>{t("matchDayMissing", { count: matchDayBanner.missingCount })}</span>
              <span className="text-red-400/75" aria-hidden>
                ·
              </span>
              <span>{t("matchDayLocksIn", { time: matchDayBanner.locksInFormatted })}</span>
            </span>
          </Link>
        ) : null}

        {matchDayBanner && matchDayBanner.variant === "allSet" ? (
          <div className="mt-6 rounded-lg border border-emerald-500/35 bg-emerald-600/15 p-3 text-center text-sm font-medium text-emerald-100">
            <span aria-hidden>✅ </span>
            {t("matchDayAllSet", { count: matchDayBanner.todayMatchCount })}
          </div>
        ) : null}

        <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("myGroupsHeading")}
        </h2>

        <DashboardGroupList locale={locale} profileTimeZone={profileTimeZone} groups={summaries} />
      </section>
    </main>
  );
}
