import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GroupMatchLite, PredictionScores } from "@/lib/projected-standings";
import { compareKnockoutLabels } from "@/lib/knockout-bracket-utils";
import BracketWithTabs from "./bracket-with-tabs";
import { type BracketMatchVM, type BracketPredictionVM } from "./bracket-view";

type Props = {
  params: { locale: string; groupId: string };
};

const KNOCKOUT_PHASES = ["round_of_16", "quarter_final", "semi_final", "third_place", "final"] as const;

export default async function GroupBracketPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/bracket`)}`);
  }

  const { data: group, error: groupError } = await supabase.from("groups").select("id,name").eq("id", groupId).single();

  if (groupError || !group) {
    notFound();
  }

  const groupName = group.name as string;

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: groupRow } = await supabase.from("groups").select("admin_id").eq("id", groupId).single();
  const isAdmin = groupRow?.admin_id === user.id;

  if (!isAdmin && !membership) {
    redirect(`/${locale}/dashboard`);
  }

  const { data: groupMatchRows } = await supabase
    .from("matches")
    .select("id,phase,home_team,away_team")
    .eq("phase", "group")
    .order("match_time", { ascending: true });

  const groupStageMatches = (groupMatchRows ?? []) as GroupMatchLite[];

  const { data: matchRows } = await supabase
    .from("matches")
    .select(
      "id,phase,home_team,away_team,home_score,away_score,status,knockout_label,home_source,away_source,match_time,locked_at",
    )
    .in("phase", [...KNOCKOUT_PHASES])
    .order("match_time", { ascending: true });

  const matches = (matchRows ?? []) as BracketMatchVM[];
  matches.sort((a, b) => compareKnockoutLabels(a.knockout_label, b.knockout_label));

  const matchIds = matches.map((m) => m.id);
  const groupIds = groupStageMatches.map((m) => m.id);
  const seen = new Set<string>();
  const allIds: string[] = [];
  for (const id of [...matchIds, ...groupIds]) {
    if (!seen.has(id)) {
      seen.add(id);
      allIds.push(id);
    }
  }

  const predictionByMatch: Record<string, BracketPredictionVM> = {};
  const groupPredictionScores: PredictionScores = {};
  if (allIds.length > 0) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("match_id,predicted_home,predicted_away")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .in("match_id", allIds);
    const groupIdSet = new Set(groupIds);
    for (const p of preds ?? []) {
      const mid = p.match_id as string;
      predictionByMatch[mid] = {
        match_id: mid,
        predicted_home: p.predicted_home as number,
        predicted_away: p.predicted_away as number,
      };
      if (groupIdSet.has(mid)) {
        groupPredictionScores[mid] = { home: p.predicted_home as number, away: p.predicted_away as number };
      }
    }
  }

  return (
    <main className="animate-page-in min-h-screen bg-[#0A0E14] px-4 py-8">
      <section className="mx-auto w-full max-w-[1600px] rounded-xl border border-dark-600 bg-dark-800/60 p-5 sm:p-6">
        <Link href={`/${locale}/dashboard/group/${groupId}`} className="text-sm font-medium text-gpri hover:text-gpri/90">
          {common("backToGroup", { groupName })}
        </Link>
        <BracketWithTabs
          knockoutMatches={matches}
          groupStageMatches={groupStageMatches}
          groupPredictionScores={groupPredictionScores}
          predictionsByMatchId={predictionByMatch}
        />
      </section>
    </main>
  );
}
