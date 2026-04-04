import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveDisplayName } from "@/lib/display-name";
import { DEFAULT_TIMEZONE } from "@/lib/format-match-time";
import GroupHubClient, {
  type GroupHubData,
  type LeaderboardPreviewRow,
  type RecentResultRow,
} from "./group-hub";
import type { GroupAccessMode } from "@/types/supabase";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
  admin_id: string;
  primary_color: string | null;
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
};

export default async function GroupHubPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select(
      "id,name,slug,admin_id,primary_color,points_correct_result,points_correct_difference,points_exact_score",
    )
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as GroupRecord;

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", typedGroup.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = typedGroup.admin_id === user.id;
  if (!isAdmin && !membership) {
    redirect(`/${locale}/dashboard`);
  }

  let hubAccessMode: GroupAccessMode = "open";
  let hubAccessCode: string | null = null;
  if (isAdmin) {
    const { data: accessRows } = await supabase.rpc("admin_group_access", { p_group_id: typedGroup.id });
    const row = accessRows?.[0];
    if (row?.access_mode === "open" || row?.access_mode === "protected") {
      hubAccessMode = row.access_mode;
    }
    hubAccessCode = row?.access_code ?? null;
  }

  const nowIso = new Date().toISOString();

  const [
    memberCountRes,
    profileRes,
    nextMatchRes,
    totalMatchesRes,
    predCountRes,
    picksRes,
    topBoardRes,
    myBoardRes,
    finishedRes,
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", typedGroup.id),
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase
      .from("matches")
      .select("id,home_team,away_team,match_time,locked_at")
      .eq("status", "scheduled")
      .gt("match_time", nowIso)
      .order("match_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("group_id", typedGroup.id)
      .eq("user_id", user.id),
    supabase
      .from("pre_tournament_picks")
      .select("champion,runner_up,third_place,top_scorer,best_player,best_goalkeeper")
      .eq("group_id", typedGroup.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("leaderboard")
      .select("user_id,rank,total_points")
      .eq("group_id", typedGroup.id)
      .order("rank", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("leaderboard")
      .select("rank,total_points")
      .eq("group_id", typedGroup.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id,home_team,away_team,home_score,away_score,match_time")
      .eq("status", "finished")
      .order("match_time", { ascending: false })
      .limit(3),
  ]);

  const memberCount = memberCountRes.count ?? 0;
  const profileTz = ((profileRes.data?.timezone as string | undefined) ?? "").trim();
  const profileTimezone = profileTz || DEFAULT_TIMEZONE;

  const nextMatchRow = nextMatchRes.data as {
    id: string;
    home_team: string;
    away_team: string;
    match_time: string;
    locked_at: string | null;
  } | null;

  let nextMatchPrediction: { home: number; away: number } | null = null;
  if (nextMatchRow) {
    const { data: np } = await supabase
      .from("predictions")
      .select("predicted_home,predicted_away")
      .eq("group_id", typedGroup.id)
      .eq("user_id", user.id)
      .eq("match_id", nextMatchRow.id)
      .maybeSingle();
    if (np) {
      nextMatchPrediction = { home: np.predicted_home as number, away: np.predicted_away as number };
    }
  }

  const picks = picksRes.data as {
    champion: string | null;
    runner_up: string | null;
    third_place: string | null;
    top_scorer: string | null;
    best_player: string | null;
    best_goalkeeper: string | null;
  } | null;

  const picksComplete = !!(
    picks &&
    picks.champion &&
    picks.runner_up &&
    picks.third_place &&
    picks.top_scorer &&
    picks.best_player &&
    picks.best_goalkeeper
  );

  const topRows = (topBoardRes.data ?? []) as {
    user_id: string;
    rank: number | null;
    total_points: number;
  }[];
  const topIds = topRows.map((r) => r.user_id);
  const inTop5 = topIds.includes(user.id);
  const nameIds = Array.from(new Set(topIds.concat(user.id)));

  const { data: memPick } = await supabase
    .from("group_members")
    .select("user_id,display_name")
    .eq("group_id", typedGroup.id)
    .in("user_id", nameIds);

  const { data: profPick } = await supabase.from("profiles").select("id,display_name").in("id", nameIds);

  const memberMap = new Map((memPick ?? []).map((m) => [m.user_id as string, m.display_name as string]));
  const profileMap = new Map((profPick ?? []).map((p) => [p.id as string, p.display_name as string]));

  const selfEmail = user.email ?? undefined;

  function displayFor(uid: string, isSelf: boolean): string {
    return resolveDisplayName(
      profileMap.get(uid),
      memberMap.get(uid),
      isSelf ? selfEmail : undefined,
    );
  }

  const leaderboardTop: LeaderboardPreviewRow[] = topRows.map((r) => ({
    userId: r.user_id,
    rank: r.rank,
    points: r.total_points,
    displayName: displayFor(r.user_id, r.user_id === user.id),
  }));

  const myBoard = myBoardRes.data as { rank: number | null; total_points: number } | null;
  const showLeaderboardSelfRow = Boolean(myBoard && !inTop5);
  const leaderboardSelf: LeaderboardPreviewRow | null = showLeaderboardSelfRow
    ? {
        userId: user.id,
        rank: myBoard!.rank,
        points: myBoard!.total_points,
        displayName: displayFor(user.id, true),
      }
    : null;

  const finished = (finishedRes.data ?? []) as {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
  }[];
  const finishedIds = finished.map((m) => m.id);

  type PredLite = { match_id: string; predicted_home: number; predicted_away: number; points_earned: number };
  let predsForFinished: PredLite[] = [];
  if (finishedIds.length > 0) {
    const { data: prs } = await supabase
      .from("predictions")
      .select("match_id,predicted_home,predicted_away,points_earned")
      .eq("group_id", typedGroup.id)
      .eq("user_id", user.id)
      .in("match_id", finishedIds);
    predsForFinished = (prs ?? []) as PredLite[];
  }
  const predByMatch = new Map(predsForFinished.map((p) => [p.match_id, p]));

  const recentResults: RecentResultRow[] = finished.map((m) => {
    const pr = predByMatch.get(m.id);
    return {
      matchId: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: m.home_score ?? 0,
      awayScore: m.away_score ?? 0,
      predHome: pr?.predicted_home ?? null,
      predAway: pr?.predicted_away ?? null,
      pointsEarned: pr?.points_earned ?? 0,
    };
  });

  const hubData: GroupHubData = {
    locale,
    groupId: typedGroup.id,
    slug: typedGroup.slug,
    groupName: typedGroup.name,
    primaryColor: typedGroup.primary_color,
    isAdmin,
    memberCount,
    pointsResult: typedGroup.points_correct_result,
    pointsDiff: typedGroup.points_correct_difference,
    pointsExact: typedGroup.points_exact_score,
    profileTimezone,
    nextMatch: nextMatchRow
      ? {
          id: nextMatchRow.id,
          homeTeam: nextMatchRow.home_team,
          awayTeam: nextMatchRow.away_team,
          matchTime: nextMatchRow.match_time,
          lockedAt: nextMatchRow.locked_at ?? nextMatchRow.match_time,
        }
      : null,
    nextMatchPrediction,
    totalMatches: totalMatchesRes.count ?? 0,
    predictionsMadeCount: predCountRes.count ?? 0,
    userRank: myBoard?.rank ?? null,
    picksComplete,
    leaderboardTop,
    showLeaderboardSelfRow,
    leaderboardSelf,
    recentResults,
    accessMode: hubAccessMode,
    accessCode: hubAccessCode,
  };

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link href={`/${locale}/dashboard`} className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
          {common("backToGroups")}
        </Link>
        <GroupHubClient data={hubData} />
      </section>
    </main>
  );
}

