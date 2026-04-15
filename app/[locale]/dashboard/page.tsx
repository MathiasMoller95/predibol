import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { createClient } from "@/lib/supabase/server";
import DashboardGroupList, { type GroupSummary } from "./dashboard-group-list";

const WORLD_CUP_KICKOFF_UTC = Date.UTC(2026, 5, 11, 0, 0, 0);

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
      supabase.from("groups").select("id,name,primary_color").in("id", groupIds),
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

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-6xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
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

        <DashboardGroupList locale={locale} profileTimeZone={profileTimeZone} groups={summaries} />
      </section>
    </main>
  );
}
