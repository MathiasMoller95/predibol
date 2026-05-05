import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveDisplayName } from "@/lib/display-name";
import { mergeGroupLeaderboardRows, type LeaderboardDbRow } from "@/lib/group-leaderboard-merge";
import { positiveStreaksByUser } from "@/lib/leaderboard-streaks";
import { AI_PLAYER_ID, AI_PLAYER_NAME } from "@/lib/constants";
import LeaderboardBoard from "./leaderboard-board";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  admin_id: string;
  logo_url: string | null;
};

type MemberRow = {
  user_id: string;
  display_name: string;
};

type ProfileRow = { id: string; display_name: string };

export default async function GroupLeaderboardPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Leaderboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/leaderboard`)}`);
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,name,admin_id,logo_url")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as GroupRecord;
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership && typedGroup.admin_id !== user.id) {
    redirect(`/${locale}/dashboard`);
  }

  const [
    { data: boardRows },
    { data: members },
    { data: predsForStreak },
    { count: totalMatches },
    { count: finishedMatchCount },
    { data: picksRows },
  ] = await Promise.all([
    supabase
      .from("leaderboard")
      .select(
        "user_id,rank,previous_rank,total_points,correct_results,exact_scores,predictions_made,virtual_pnl,virtual_bets_won,virtual_bets_lost"
      )
      .eq("group_id", groupId)
      .order("rank", { ascending: true, nullsFirst: false }),
    supabase.from("group_members").select("user_id,display_name").eq("group_id", groupId),
    supabase
      .from("predictions")
      .select("user_id,match_id,points_earned,submitted_at")
      .eq("group_id", groupId),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "finished"),
    supabase
      .from("pre_tournament_picks")
      .select("user_id,champion,runner_up,third_place,top_scorer,best_player,best_goalkeeper")
      .eq("group_id", groupId),
  ]);

  const memberList = (members ?? []) as MemberRow[];
  const boardUserIds = new Set(((boardRows ?? []) as unknown as LeaderboardDbRow[]).map((r) => r.user_id));
  if (boardUserIds.has(AI_PLAYER_ID) && !memberList.some((m) => m.user_id === AI_PLAYER_ID)) {
    memberList.push({ user_id: AI_PLAYER_ID, display_name: AI_PLAYER_NAME });
  }

  const memberByUser = new Map(memberList.map((m) => [m.user_id, m.display_name]));
  const memberIds = memberList.map((m) => m.user_id);
  let profileByUserId = new Map<string, string>();
  if (memberIds.length > 0) {
    const { data: profileRows } = await supabase.from("profiles").select("id,display_name").in("id", memberIds);
    profileByUserId = new Map(
      ((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p.display_name])
    );
  }

  const rowsMerged = mergeGroupLeaderboardRows(
    memberList,
    (boardRows ?? []) as unknown as LeaderboardDbRow[],
    (uid) =>
      resolveDisplayName(
        profileByUserId.get(uid),
        memberByUser.get(uid),
        uid === user.id ? user.email : undefined
      ),
  );

  const mids = Array.from(new Set((predsForStreak ?? []).map((p) => p.match_id as string)));
  let streakByUid: Record<string, number> = {};
  if (mids.length > 0) {
    const { data: mrows } = await supabase
      .from("matches")
      .select("id,match_time,status")
      .in("id", mids)
      .eq("status", "finished");

    const timeByMid = new Map((mrows ?? []).map((m) => [m.id as string, m.match_time as string]));
    const finishedRows = ((predsForStreak ?? []) as { user_id: string; match_id: string; points_earned: number | null }[])
      .filter((p) => timeByMid.has(p.match_id))
      .map((p) => ({
        user_id: p.user_id,
        points_earned: p.points_earned,
        match_time_match: timeByMid.get(p.match_id)!,
      }));
    streakByUid = positiveStreaksByUser(finishedRows);
  }

  const rows = rowsMerged.map((r) => ({
    ...r,
    positiveStreak:
      streakByUid[r.user_id] != null && streakByUid[r.user_id]! >= 3 ? streakByUid[r.user_id] : undefined,
  }));

  const maxPoints = rows.reduce((m, r) => Math.max(m, r.total_points ?? 0), 0);
  const preTournamentMode = maxPoints === 0 && (finishedMatchCount ?? 0) === 0;

  const predCountByUser = new Map<string, number>();
  const firstSubmittedAtByUser = new Map<string, string>();
  for (const p of (predsForStreak ?? []) as unknown as { user_id: string; submitted_at: string | null }[]) {
    const uid = p.user_id as string;
    predCountByUser.set(uid, (predCountByUser.get(uid) ?? 0) + 1);
    const s = p.submitted_at;
    if (s) {
      const prev = firstSubmittedAtByUser.get(uid);
      if (!prev || s < prev) firstSubmittedAtByUser.set(uid, s);
    }
  }

  const picksCompleteByUser = new Map<string, boolean>();
  for (const pr of (picksRows ?? []) as unknown as {
    user_id: string;
    champion: string | null;
    runner_up: string | null;
    third_place: string | null;
    top_scorer: string | null;
    best_player: string | null;
    best_goalkeeper: string | null;
  }[]) {
    const complete =
      !!pr.champion?.trim() &&
      !!pr.runner_up?.trim() &&
      !!pr.third_place?.trim() &&
      !!pr.top_scorer?.trim() &&
      !!pr.best_player?.trim() &&
      !!pr.best_goalkeeper?.trim();
    picksCompleteByUser.set(pr.user_id, complete);
  }

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          {typedGroup.logo_url ? (
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-dark-900">
              <Image
                src={typedGroup.logo_url}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
                unoptimized
              />
            </span>
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-dark-900 text-lg text-slate-500"
              aria-hidden
            >
              ⚽
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("subtitle", { groupName: typedGroup.name })}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <LeaderboardBoard
            groupName={typedGroup.name}
            locale={locale}
            currentUserId={user.id}
            rows={rows}
            preTournament={
              preTournamentMode
                ? {
                    totalMatches: totalMatches ?? 0,
                    predictionCountByUser: Object.fromEntries(predCountByUser.entries()),
                    firstSubmittedAtByUser: Object.fromEntries(firstSubmittedAtByUser.entries()),
                    picksCompleteByUser: Object.fromEntries(picksCompleteByUser.entries()),
                  }
                : null
            }
          />
        )}
      </section>
    </main>
  );
}
