import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import type { GroupAccessMode } from "@/types/supabase";
import AdminMatchPanel, { type AdminMatch, type PredictionLite } from "./admin-match-panel";
import GroupAccessAdminPanel from "./group-access-admin-panel";
import ReminderTestButton from "./reminder-test-button";
import DangerZone from "./danger-zone";

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

  const { data: accessRows } = await supabase.rpc("admin_group_access", { p_group_id: groupId });
  const accessRow = accessRows?.[0];
  let initialAccessMode: GroupAccessMode = "open";
  let initialAccessCode: string | null = null;
  if (accessRow?.access_mode === "open" || accessRow?.access_mode === "protected") {
    initialAccessMode = accessRow.access_mode;
  }
  initialAccessCode = accessRow?.access_code ?? null;

  const { data: profileRow } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const profileTimeZone = ((profileRow?.timezone as string | undefined) ?? "").trim() || null;

  const [{ data: matches }, { data: predictions }, { data: members }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id,phase,home_team,away_team,match_time,home_score,away_score,status,knockout_label,home_source,away_source,advancing_team",
      )
      .order("match_time", { ascending: true }),
    supabase.from("predictions").select("match_id,user_id").eq("group_id", groupId),
    supabase.from("group_members").select("user_id,display_name").eq("group_id", groupId),
  ]);

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-5xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-400">{typedGroup.name}</p>
          </div>
          <Link
            href={`/${locale}/dashboard/group/${groupId}`}
            className="inline-flex rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:bg-dark-600"
          >
            {t("cancel")}
          </Link>
        </div>

        <GroupAccessAdminPanel
          groupId={groupId}
          initialMode={initialAccessMode}
          initialCode={initialAccessCode}
        />

        <AdminMatchPanel
          profileTimeZone={profileTimeZone}
          matches={((matches ?? []) as AdminMatch[]).map((match) => ({
            ...match,
            home_score: match.home_score ?? null,
            away_score: match.away_score ?? null,
            knockout_label: match.knockout_label ?? null,
            home_source: match.home_source ?? null,
            away_source: match.away_source ?? null,
            advancing_team: match.advancing_team ?? null,
          }))}
          predictions={(predictions ?? []) as PredictionLite[]}
          totalMembers={((members ?? []) as MemberRecord[]).length}
          isSuperAdmin={isSuperAdmin(user.id)}
        />

        <ReminderTestButton />

        <DangerZone groupName={typedGroup.name} />
      </section>
    </main>
  );
}
