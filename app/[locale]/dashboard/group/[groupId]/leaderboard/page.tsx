import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveDisplayName } from "@/lib/display-name";

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
      .select("user_id,rank,total_points,correct_results,exact_scores,predictions_made")
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

  const rows = ((boardRows ?? []) as LeaderboardRow[]).map((row) => ({
    ...row,
    display_name: resolveDisplayName(
      profileByUserId.get(row.user_id),
      memberByUser.get(row.user_id),
      row.user_id === user.id ? user.email : undefined
    ),
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-600">{t("subtitle", { groupName: typedGroup.name })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/group/${groupId}`}
              className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              {t("backToGroup")}
            </Link>
            <Link
              href={`/${locale}/dashboard/group/${groupId}/predict`}
              className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
            >
              {t("openPredictions")}
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-600">{t("empty")}</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="whitespace-nowrap py-3 pr-4">{t("colRank")}</th>
                  <th className="whitespace-nowrap py-3 pr-4">{t("colName")}</th>
                  <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colPoints")}</th>
                  <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colCorrectResults")}</th>
                  <th className="whitespace-nowrap py-3 pr-4 text-right">{t("colExactScores")}</th>
                  <th className="whitespace-nowrap py-3 text-right">{t("colPredictionsMade")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelf = row.user_id === user.id;
                  return (
                    <tr
                      key={row.user_id}
                      className={
                        isSelf
                          ? "border-b border-slate-100 bg-emerald-50 ring-1 ring-inset ring-emerald-200/80"
                          : "border-b border-slate-100"
                      }
                    >
                      <td className="whitespace-nowrap py-3 pr-4 font-medium text-slate-900">
                        {row.rank ?? "—"}
                        {isSelf ? (
                          <span className="ml-2 rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            {t("youBadge")}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-slate-800">{row.display_name}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-900">{row.total_points}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-800">{row.correct_results}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-800">{row.exact_scores}</td>
                      <td className="py-3 text-right tabular-nums text-slate-800">{row.predictions_made}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
