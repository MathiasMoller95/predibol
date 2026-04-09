import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { resolveGroupTheme } from "@/lib/group-theme";
import type { GroupAccessMode, Json } from "@/types/supabase";
import AdminMatchPanel, { type AdminMatch, type PredictionLite } from "./admin-match-panel";
import GroupAccessAdminPanel from "./group-access-admin-panel";
import GroupIdentityPanel from "./group-identity-panel";
import MemberActivitySection, { type MemberActivityRow } from "./member-activity-section";
import ReminderTestButton from "./reminder-test-button";
import DangerZone from "./danger-zone";
import WhatsappReminder from "./whatsapp-reminder";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
  admin_id: string;
  colors: Json | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
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
    .select("id,name,slug,admin_id,colors,logo_url,primary_color,secondary_color")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as GroupRecord;
  if (typedGroup.admin_id !== user.id) {
    redirect(`/${locale}/dashboard/group/${groupId}`);
  }

  const theme = resolveGroupTheme({
    colors: typedGroup.colors,
    primary_color: typedGroup.primary_color,
    secondary_color: typedGroup.secondary_color,
  });

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

  const [
    { data: matches },
    { data: predictions },
    { data: members },
    { count: totalMatches },
    { data: preTournament },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id,phase,home_team,away_team,match_time,home_score,away_score,status,knockout_label,home_source,away_source,advancing_team",
      )
      .order("match_time", { ascending: true }),
    supabase.from("predictions").select("match_id,user_id,submitted_at").eq("group_id", groupId),
    supabase.from("group_members").select("user_id,display_name").eq("group_id", groupId),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase
      .from("pre_tournament_picks")
      .select(
        "user_id,champion,runner_up,third_place,top_scorer,best_player,best_goalkeeper",
      )
      .eq("group_id", groupId),
  ]);

  const tm = totalMatches ?? 0;
  type PickRow = {
    user_id: string;
    champion: string | null;
    runner_up: string | null;
    third_place: string | null;
    top_scorer: string | null;
    best_player: string | null;
    best_goalkeeper: string | null;
  };
  function picksCompleteRow(p: PickRow | undefined): boolean {
    if (!p) return false;
    return !!(
      p.champion &&
      p.runner_up &&
      p.third_place &&
      p.top_scorer &&
      p.best_player &&
      p.best_goalkeeper
    );
  }
  const pickByUser = new Map<string, PickRow>(
    ((preTournament ?? []) as PickRow[]).map((p) => [p.user_id, p]),
  );
  const predAgg = new Map<string, { count: number; last: string | null }>();
  for (const pr of predictions ?? []) {
    const uid = (pr as { user_id: string }).user_id;
    const cur = predAgg.get(uid) ?? { count: 0, last: null };
    cur.count += 1;
    const sa = (pr as { submitted_at?: string }).submitted_at;
    if (sa && (!cur.last || sa > cur.last)) cur.last = sa;
    predAgg.set(uid, cur);
  }
  const activityRows: MemberActivityRow[] = ((members ?? []) as MemberRecord[])
    .map((m) => {
      const agg = predAgg.get(m.user_id) ?? { count: 0, last: null };
      return {
        userId: m.user_id,
        displayName: m.display_name,
        predictionsSubmitted: agg.count,
        totalMatches: tm,
        picksComplete: picksCompleteRow(pickByUser.get(m.user_id)),
        lastActiveIso: agg.last,
      };
    })
    .sort((a, b) => {
      if (a.predictionsSubmitted !== b.predictionsSubmitted) {
        return a.predictionsSubmitted - b.predictionsSubmitted;
      }
      return a.displayName.localeCompare(b.displayName);
    });

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-5xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-gpri hover:text-gpri/90"
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
            className="inline-flex rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-gpri/40 hover:bg-dark-600"
          >
            {t("cancel")}
          </Link>
        </div>

        <GroupIdentityPanel
          groupId={groupId}
          initialLogoUrl={typedGroup.logo_url}
          initialPrimary={theme.primary}
          initialSecondary={theme.secondary}
          initialTintHex={theme.primary}
        />

        <MemberActivitySection locale={locale} rows={activityRows} />

        <WhatsappReminder locale={locale} groupName={typedGroup.name} slug={typedGroup.slug} rows={activityRows} />

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
