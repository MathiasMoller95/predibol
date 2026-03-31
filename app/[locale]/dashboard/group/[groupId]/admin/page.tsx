import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminMatchPanel, { type AdminMatch, type PredictionLite } from "./admin-match-panel";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  admin_id: string;
};

type MemberRecord = {
  user_id: string;
  display_name: string;
};

export default async function GroupAdminResultsPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminPage");
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/admin`)}`);
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
  if (typedGroup.admin_id !== user.id) {
    redirect(`/${locale}/dashboard/group/${groupId}`);
  }

  const [{ data: matches }, { data: predictions }, { data: members }] = await Promise.all([
    supabase
      .from("matches")
      .select("id,phase,home_team,away_team,match_time,home_score,away_score,status")
      .order("match_time", { ascending: true }),
    supabase.from("predictions").select("match_id,user_id").eq("group_id", groupId),
    supabase.from("group_members").select("user_id,display_name").eq("group_id", groupId),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-5xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-600">{typedGroup.name}</p>
          </div>
          <Link
            href={`/${locale}/dashboard/group/${groupId}`}
            className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            {t("cancel")}
          </Link>
        </div>

        <AdminMatchPanel
          matches={((matches ?? []) as AdminMatch[]).map((match) => ({
            ...match,
            home_score: match.home_score ?? null,
            away_score: match.away_score ?? null,
          }))}
          predictions={(predictions ?? []) as PredictionLite[]}
          totalMembers={((members ?? []) as MemberRecord[]).length}
        />
      </section>
    </main>
  );
}
