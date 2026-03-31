import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardGroupList, { type GroupSummary } from "./dashboard-group-list";

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

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberships ?? []).map((row) => row.group_id as string);

  let groups: Array<{
    id: string;
    name: string;
    admin_id: string;
    primary_color: string | null;
  }> = [];

  let memberCounts: Record<string, number> = {};
  const leaderboardByGroup: Record<string, { rank: number | null; total_points: number }> = {};
  let predictedGroupsForNextMatch = new Set<string>();

  const nowIso = new Date().toISOString();
  const { data: nextMatch } = await supabase
    .from("matches")
    .select("id,home_team,away_team,match_time,status,locked_at")
    .eq("status", "scheduled")
    .gt("match_time", nowIso)
    .order("match_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (groupIds.length > 0) {
    const [{ data: groupRows }, { data: leaderboardRows }] = await Promise.all([
      supabase.from("groups").select("id,name,admin_id,primary_color").in("id", groupIds),
      supabase
        .from("leaderboard")
        .select("group_id,rank,total_points")
        .eq("user_id", user.id)
        .in("group_id", groupIds),
    ]);

    groups = (groupRows ?? []) as typeof groups;
    (leaderboardRows ?? []).forEach((row) => {
      leaderboardByGroup[row.group_id as string] = {
        rank: (row.rank as number | null) ?? null,
        total_points: (row.total_points as number) ?? 0,
      };
    });

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
        adminId: group.admin_id,
        primaryColor: group.primary_color,
        totalMembers,
        rank: lb?.rank ?? null,
        points: lb?.total_points ?? 0,
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-6xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
          </div>
          <a
            href={`/${locale}/dashboard/create-group`}
            className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            {t("createGroup")}
          </a>
        </div>

        <DashboardGroupList locale={locale} currentUserId={user.id} groups={summaries} />
      </section>
    </main>
  );
}
