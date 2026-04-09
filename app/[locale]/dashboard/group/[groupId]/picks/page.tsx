import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PicksForm, { type InitialPicks } from "./picks-form";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  admin_id: string;
};

export default async function GroupPicksPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Picks");
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/picks`)}`);
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

  const [{ data: firstMatch }, { data: picksRow }] = await Promise.all([
    supabase.from("matches").select("match_time").order("match_time", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("pre_tournament_picks").select("*").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
  ]);

  const kickoff = firstMatch?.match_time ? new Date(firstMatch.match_time as string) : null;
  const locked = kickoff != null && new Date() >= kickoff;

  const initial: InitialPicks = picksRow
    ? {
        champion: picksRow.champion as string | null,
        runner_up: picksRow.runner_up as string | null,
        third_place: picksRow.third_place as string | null,
        top_scorer: picksRow.top_scorer as string | null,
        best_player: picksRow.best_player as string | null,
        best_goalkeeper: picksRow.best_goalkeeper as string | null,
      }
    : null;

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-gpri hover:text-gpri/90"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/group/${groupId}`}
              className="inline-flex rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-gpri/40 hover:bg-dark-600"
            >
              {t("backToGroup")}
            </Link>
          </div>
        </div>

        <PicksForm locked={locked} initial={initial} />
      </section>
    </main>
  );
}
