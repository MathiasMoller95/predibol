import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PredictForm from "./predict-form";
import Link from "next/link";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  admin_id: string;
};

type MatchRecord = {
  id: string;
  phase: string;
  home_team: string;
  away_team: string;
  match_time: string;
  locked_at: string;
  status: string;
};

type PredictionRecord = {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
};

export default async function GroupPredictPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Predictions");
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/predict`)}`);
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

  const nowIso = new Date().toISOString();
  const { data: matches } = await supabase
    .from("matches")
    .select("id,phase,home_team,away_team,match_time,locked_at,status")
    .gte("match_time", nowIso)
    .order("match_time", { ascending: true });

  const typedMatches = ((matches ?? []) as MatchRecord[]).filter((match) => match.status === "scheduled");
  const matchIds = typedMatches.map((match) => match.id);

  let predictions: PredictionRecord[] = [];
  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("predictions")
      .select("match_id,predicted_home,predicted_away,predicted_winner")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .in("match_id", matchIds);

    predictions = (data ?? []) as PredictionRecord[];
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle", { groupName: typedGroup.name })}</p>

        <PredictForm matches={typedMatches} initialPredictions={predictions} />
      </section>
    </main>
  );
}
