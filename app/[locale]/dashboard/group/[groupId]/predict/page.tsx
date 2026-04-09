import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AI_PLAYER_ID } from "@/lib/constants";
import PredictForm from "./predict-form";
import Link from "next/link";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  admin_id: string;
  powers_double_down: number;
  powers_spy: number;
  powers_shield: number;
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
  knockout_label: string | null;
};

type PredictionRecord = {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_winner: "home" | "away" | "draw" | null;
  predicted_advancing: string | null;
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
    .select("id,name,admin_id,powers_double_down,powers_spy,powers_shield")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as unknown as GroupRecord;
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

  const { data: allUserPredictions } = await supabase
    .from("predictions")
    .select("match_id,predicted_home,predicted_away,predicted_winner,predicted_advancing")
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  const allPredList = (allUserPredictions ?? []) as PredictionRecord[];
  const predByMatchId = new Map(allPredList.map((p) => [p.match_id, p]));

  const nowIso = new Date().toISOString();
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id,phase,home_team,away_team,match_time,locked_at,status,home_win_odds,draw_odds,away_win_odds,ai_home_score,ai_away_score,knockout_label",
    )
    .gte("match_time", nowIso)
    .order("match_time", { ascending: true });

  const typedMatches = ((matches ?? []) as MatchRecord[]).filter((match) => match.status === "scheduled");
  const matchIds = typedMatches.map((match) => match.id);

  let predictions: PredictionRecord[] = [];
  if (matchIds.length > 0) {
    predictions = allPredList.filter((p) => matchIds.includes(p.match_id));
  }

  // Fetch group members (for spy target list + who-has-predicted badges)
  const { data: membersData } = await supabase
    .from("group_members")
    .select("user_id,display_name")
    .eq("group_id", groupId);
  const groupMembers = ((membersData ?? []) as { user_id: string; display_name: string }[])
    .filter((m) => m.user_id !== AI_PLAYER_ID)
    .map((m) => ({ userId: m.user_id, displayName: m.display_name }));

  // power_usage table not yet in generated types — will be after migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: powerRows } = await (supabase as any)
    .from("power_usage")
    .select("id,match_id,power_type,target_user_id")
    .eq("user_id", user.id)
    .eq("group_id", groupId);
  const powerUsage = ((powerRows ?? []) as { id: string; match_id: string; power_type: string; target_user_id: string | null }[]).map(
    (r) => ({ id: r.id, matchId: r.match_id, powerType: r.power_type, targetUserId: r.target_user_id })
  );

  // Fetch who has predicted per upcoming match
  let predictionsByMatch: Record<string, string[]> = {};
  if (matchIds.length > 0) {
    const { data: allPreds } = await supabase
      .from("predictions")
      .select("match_id,user_id")
      .eq("group_id", groupId)
      .in("match_id", matchIds);
    const map: Record<string, string[]> = {};
    for (const row of (allPreds ?? []) as { match_id: string; user_id: string }[]) {
      (map[row.match_id] ??= []).push(row.user_id);
    }
    predictionsByMatch = map;
  }

  type FinishedPick = MatchRecord & {
    home_score: number;
    away_score: number;
    predicted_home: number;
    predicted_away: number;
  };

  let finishedPicks: FinishedPick[] = [];
  const allPredMatchIds = Array.from(new Set(allPredList.map((p) => p.match_id)));
  if (allPredMatchIds.length > 0) {
    const { data: finRows } = await supabase
      .from("matches")
      .select(
        "id,phase,home_team,away_team,match_time,locked_at,status,home_win_odds,draw_odds,away_win_odds,ai_home_score,ai_away_score,knockout_label,home_score,away_score",
      )
      .in("id", allPredMatchIds)
      .eq("status", "finished")
      .order("match_time", { ascending: false })
      .limit(48);

    finishedPicks = (finRows ?? [])
      .map((row) => {
        const rec = row as MatchRecord & { home_score: number | null; away_score: number | null };
        const pr = predByMatchId.get(rec.id);
        if (
          pr == null ||
          rec.home_score == null ||
          rec.away_score == null
        ) {
          return null;
        }
        return {
          ...rec,
          home_score: rec.home_score,
          away_score: rec.away_score,
          predicted_home: pr.predicted_home,
          predicted_away: pr.predicted_away,
        } as FinishedPick;
      })
      .filter((x): x is FinishedPick => x != null);
  }

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <Link
          href={`/${locale}/dashboard/group/${groupId}`}
          className="text-sm font-medium text-gpri hover:text-gpri/90"
        >
          {common("backToGroup", { groupName: typedGroup.name })}
        </Link>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle", { groupName: typedGroup.name })}</p>

        <PredictForm
          matches={typedMatches}
          initialPredictions={predictions}
          profileTimeZone={profileTimeZone}
          finishedPicks={finishedPicks}
          groupMembers={groupMembers}
          powerUsage={powerUsage}
          powerLimits={{
            doubleDown: typedGroup.powers_double_down ?? 3,
            spy: typedGroup.powers_spy ?? 2,
            shield: typedGroup.powers_shield ?? 2,
          }}
          predictionsByMatch={predictionsByMatch}
          currentUserId={user.id}
        />
      </section>
    </main>
  );
}
