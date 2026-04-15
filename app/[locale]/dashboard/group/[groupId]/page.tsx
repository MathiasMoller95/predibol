import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveDisplayName } from "@/lib/display-name";
import { DEFAULT_TIMEZONE } from "@/lib/format-match-time";
import GroupHubClient, {
  type GroupHubData,
  type LeaderboardPreviewRow,
  type RecentResultRow,
} from "./group-hub";
import type { GroupAccessMode } from "@/types/supabase";
import { computeBracketHubStatus } from "@/lib/knockout-bracket-utils";
import { mergeGroupLeaderboardRows, type LeaderboardDbRow } from "@/lib/group-leaderboard-merge";
import { resolveGroupTheme } from "@/lib/group-theme";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
  admin_id: string;
  primary_color: string | null;
  secondary_color: string | null;
  colors: import("@/types/supabase").Json | null;
  logo_url: string | null;
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
  powers_double_down: number;
  powers_spy: number;
  powers_shield: number;
};

export default async function GroupHubPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

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
      "id,name,slug,admin_id,primary_color,secondary_color,colors,logo_url,points_correct_result,points_correct_difference,points_exact_score,powers_double_down,powers_spy,powers_shield",
    )
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as unknown as GroupRecord;
  const theme = resolveGroupTheme({
    colors: typedGroup.colors,
    primary_color: typedGroup.primary_color,
    secondary_color: typedGroup.secondary_color,
  });

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
    hubMembersRes,
    hubLeaderboardRes,
    finishedRes,
    knockoutRes,
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
    supabase.from("group_members").select("user_id,display_name").eq("group_id", typedGroup.id),
    supabase
      .from("leaderboard")
      .select(
        "user_id,total_points,correct_results,exact_scores,predictions_made,virtual_pnl,virtual_bets_won,virtual_bets_lost",
      )
      .eq("group_id", typedGroup.id),
    supabase
      .from("matches")
      .select("id,home_team,away_team,home_score,away_score,match_time,home_win_odds,draw_odds,away_win_odds")
      .eq("status", "finished")
      .order("match_time", { ascending: false })
      .limit(3),
    supabase
      .from("matches")
      .select("phase,home_team,away_team,status")
      .in("phase", [
        "round_of_16",
        "quarter_final",
        "quarter",
        "semi_final",
        "semi",
        "third_place",
        "final",
      ]),
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

  const hubMemberList = (hubMembersRes.data ?? []) as { user_id: string; display_name: string }[];
  const hubMemberIds = hubMemberList.map((m) => m.user_id);
  let hubProfileMap = new Map<string, string>();
  if (hubMemberIds.length > 0) {
    const { data: profHub } = await supabase.from("profiles").select("id,display_name").in("id", hubMemberIds);
    hubProfileMap = new Map((profHub ?? []).map((p) => [p.id as string, p.display_name as string]));
  }

  const hubMemberByUser = new Map(hubMemberList.map((m) => [m.user_id, m.display_name]));
  const selfEmail = user.email ?? undefined;

  function displayForHub(uid: string, isSelf: boolean): string {
    return resolveDisplayName(
      hubProfileMap.get(uid),
      hubMemberByUser.get(uid),
      isSelf ? selfEmail : undefined,
    );
  }

  const mergedHubBoard = mergeGroupLeaderboardRows(
    hubMemberList,
    (hubLeaderboardRes.data ?? []) as LeaderboardDbRow[],
    (uid) => displayForHub(uid, uid === user.id),
  );

  const topFive = mergedHubBoard.slice(0, 5);
  const topIds = topFive.map((r) => r.user_id);
  const inTop5 = topIds.includes(user.id);
  const selfMerged = mergedHubBoard.find((r) => r.user_id === user.id);

  const leaderboardTop: LeaderboardPreviewRow[] = topFive.map((r) => ({
    userId: r.user_id,
    rank: r.rank,
    points: r.total_points,
    displayName: r.display_name,
  }));

  const showLeaderboardSelfRow = Boolean(selfMerged && !inTop5);
  const leaderboardSelf: LeaderboardPreviewRow | null = showLeaderboardSelfRow
    ? {
        userId: user.id,
        rank: selfMerged!.rank,
        points: selfMerged!.total_points,
        displayName: selfMerged!.display_name,
      }
    : null;

  const finished = (finishedRes.data ?? []) as {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    home_win_odds: number | null;
    draw_odds: number | null;
    away_win_odds: number | null;
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

  const bracketStatus = computeBracketHubStatus((knockoutRes.data ?? []) as { phase: string; home_team: string; away_team: string; status: string }[]);

  // power_usage table not yet in generated types — will be after migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: powerUsedRows } = await (supabase as any)
    .from("power_usage")
    .select("power_type")
    .eq("user_id", user.id)
    .eq("group_id", typedGroup.id);
  const puCounts = { double_down: 0, spy: 0, shield: 0 };
  for (const r of (powerUsedRows ?? []) as { power_type: string }[]) {
    if (r.power_type in puCounts) puCounts[r.power_type as keyof typeof puCounts]++;
  }
  const powersRemaining = {
    doubleDown: (typedGroup.powers_double_down ?? 3) - puCounts.double_down,
    spy: (typedGroup.powers_spy ?? 2) - puCounts.spy,
    shield: (typedGroup.powers_shield ?? 2) - puCounts.shield,
  };
  const powersLimits = {
    doubleDown: typedGroup.powers_double_down ?? 3,
    spy: typedGroup.powers_spy ?? 2,
    shield: typedGroup.powers_shield ?? 2,
  };

  // Sticker album count (table not yet in generated types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stickerCountRes = await (supabase as any)
    .from("sticker_album")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("group_id", typedGroup.id);
  const stickerCount: number = stickerCountRes?.count ?? 0;

  const recentResults: RecentResultRow[] = finished.map((m) => {
    const pr = predByMatch.get(m.id);
    const hs = m.home_score ?? 0;
    const as = m.away_score ?? 0;
    return {
      matchId: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: hs,
      awayScore: as,
      predHome: pr?.predicted_home ?? null,
      predAway: pr?.predicted_away ?? null,
      pointsEarned: pr?.points_earned ?? 0,
      virtualPnl: null,
    };
  });

  const hubData: GroupHubData = {
    locale,
    groupId: typedGroup.id,
    slug: typedGroup.slug,
    groupName: typedGroup.name,
    logoUrl: typedGroup.logo_url,
    primaryColor: theme.primary,
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
    userRank: selfMerged?.rank ?? null,
    picksComplete,
    leaderboardTop,
    showLeaderboardSelfRow,
    leaderboardSelf,
    recentResults,
    accessMode: hubAccessMode,
    accessCode: hubAccessCode,
    bracketStatus,
    powersRemaining,
    powersLimits,
    stickerCount,
  };

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 pb-8 pt-4 sm:pt-6 sm:pb-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 px-4 pt-4 pb-5 sm:p-6">
        <GroupHubClient data={hubData} />
      </section>
    </main>
  );
}

