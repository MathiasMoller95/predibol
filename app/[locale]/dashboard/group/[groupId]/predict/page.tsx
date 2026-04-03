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
  home_win_odds: number | null;
  draw_odds: number | null;
  away_win_odds: number | null;
  ai_home_score: number | null;
  ai_away_score: number | null;
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

  const { data: profileRow } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const profileTimeZone = ((profileRow?.timezone as string | undefined) ?? "").trim() || null;

  const nowIso = new Date().toISOString();
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id,phase,home_team,away_team,match_time,locked_at,status,home_win_odds,draw_odds,away_win_odds,ai_home_score,ai_away_score",
    )
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
    <main className="min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle", { groupName: typedGroup.name })}</p>

        <PredictForm matches={typedMatches} initialPredictions={predictions} profileTimeZone={profileTimeZone} />
      </section>
    </main>
  );
}
