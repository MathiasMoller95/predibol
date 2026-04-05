import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveDisplayName } from "@/lib/display-name";
import LeaderboardBoard, { type LeaderboardBoardRow } from "./leaderboard-board";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  admin_id: string;
};

type LeaderboardRow = {
  user_id: string;
  rank: number | null;
  total_points: number;
  correct_results: number;
  exact_scores: number;
  predictions_made: number;
  virtual_pnl: number | null;
  virtual_bets_won: number | null;
  virtual_bets_lost: number | null;
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
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/leaderboard`)}`);
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,name,admin_id")
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

  const [{ data: boardRows }, { data: members }] = await Promise.all([
    supabase
      .from("leaderboard")
      .select(
        "user_id,rank,total_points,correct_results,exact_scores,predictions_made,virtual_pnl,virtual_bets_won,virtual_bets_lost"
      )
      .eq("group_id", groupId)
      .order("rank", { ascending: true, nullsFirst: false }),
    supabase.from("group_members").select("user_id,display_name").eq("group_id", groupId),
  ]);

  const memberList = (members ?? []) as MemberRow[];
  const memberByUser = new Map(memberList.map((m) => [m.user_id, m.display_name]));
  const boardUserIds = Array.from(
    new Set(((boardRows ?? []) as LeaderboardRow[]).map((r) => r.user_id))
  );
  let profileByUserId = new Map<string, string>();
  if (boardUserIds.length > 0) {
    const { data: profileRows } = await supabase.from("profiles").select("id,display_name").in("id", boardUserIds);
    profileByUserId = new Map(
      ((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p.display_name])
    );
  }

  const rows: LeaderboardBoardRow[] = ((boardRows ?? []) as LeaderboardRow[]).map((row) => ({
    user_id: row.user_id,
    rank: row.rank,
    total_points: row.total_points,
    correct_results: row.correct_results,
    exact_scores: row.exact_scores,
    predictions_made: row.predictions_made,
    virtual_pnl: row.virtual_pnl ?? 0,
    virtual_bets_won: row.virtual_bets_won ?? 0,
    virtual_bets_lost: row.virtual_bets_lost ?? 0,
    display_name: resolveDisplayName(
      profileByUserId.get(row.user_id),
      memberByUser.get(row.user_id),
      row.user_id === user.id ? user.email : undefined
    ),
  }));

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("subtitle", { groupName: typedGroup.name })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/group/${groupId}`}
              className="inline-flex rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:bg-dark-600"
            >
              {t("backToGroup")}
            </Link>
            <Link
              href={`/${locale}/dashboard/group/${groupId}/predict`}
              className="inline-flex rounded-lg border border-emerald-600/50 bg-emerald-900/30 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-900/50"
            >
              {t("openPredictions")}
            </Link>
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
          />
        )}
      </section>
    </main>
  );
}
