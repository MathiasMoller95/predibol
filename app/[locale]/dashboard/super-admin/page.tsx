import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { teamFlags } from "@/lib/team-metadata";
import MatchManagement, { type SAMatch } from "./match-management";
import GroupsOverview, { type SAGroup } from "./groups-overview";

type Props = { params: { locale: string } };

type MetricsData = {
  total_users: number;
  total_groups: number;
  total_members: number;
  total_predictions: number;
  users_with_predictions: number;
  total_powers: number;
  total_stickers: number;
  matches_finished: number;
  matches_scheduled: number;
  matches_live: number;
};

export default async function SuperAdminPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.id)) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("SuperAdmin");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: metricsRaw } = await (supabase as any).rpc("super_admin_metrics", {
    p_user_id: user.id,
  });

  const m: MetricsData = metricsRaw ?? {
    total_users: 0,
    total_groups: 0,
    total_members: 0,
    total_predictions: 0,
    users_with_predictions: 0,
    total_powers: 0,
    total_stickers: 0,
    matches_finished: 0,
    matches_scheduled: 0,
    matches_live: 0,
  };

  const avgMembers = m.total_groups > 0 ? (m.total_members / m.total_groups).toFixed(1) : "0";
  const avgPredictions =
    m.users_with_predictions > 0 ? (m.total_predictions / m.users_with_predictions).toFixed(1) : "0";

  const { data: matchRows } = await supabase
    .from("matches")
    .select(
      "id,phase,home_team,away_team,match_time,home_score,away_score,status,knockout_label,home_source,away_source,advancing_team",
    )
    .order("match_time", { ascending: true });

  const matches: SAMatch[] = ((matchRows ?? []) as SAMatch[]).map((r) => ({
    ...r,
    home_score: r.home_score ?? null,
    away_score: r.away_score ?? null,
    knockout_label: r.knockout_label ?? null,
    home_source: r.home_source ?? null,
    away_source: r.away_source ?? null,
    advancing_team: r.advancing_team ?? null,
  }));

  const nextMatch = matches.find(
    (ma) => ma.status === "scheduled" && new Date(ma.match_time) > new Date(),
  );
  const nextMatchLabel = nextMatch
    ? `${teamFlags[nextMatch.home_team] ?? ""} ${nextMatch.home_team} vs ${nextMatch.away_team} ${teamFlags[nextMatch.away_team] ?? ""}`
    : "—";

  const { data: profileTzRow } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const profileTimeZone = ((profileTzRow?.timezone as string | undefined) ?? "").trim() || null;

  // Groups overview data
  const { data: groupRows } = await supabase
    .from("groups")
    .select("id,name,admin_id,access_mode,created_at")
    .order("created_at", { ascending: false });

  type GroupRow = { id: string; name: string; admin_id: string; access_mode: string; created_at: string };
  const rawGroups = (groupRows ?? []) as GroupRow[];

  const adminIds = Array.from(new Set(rawGroups.map((g) => g.admin_id)));
  const adminNames = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", adminIds);
    for (const p of (profiles ?? []) as { id: string; display_name: string }[]) {
      adminNames.set(p.id, p.display_name);
    }
  }

  // Member and prediction counts per group
  const memberCounts = new Map<string, number>();
  const predCounts = new Map<string, number>();

  for (const g of rawGroups) {
    const { count: mc } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", g.id);
    memberCounts.set(g.id, mc ?? 0);

    const { count: pc } = await supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("group_id", g.id);
    predCounts.set(g.id, pc ?? 0);
  }

  const saGroups: SAGroup[] = rawGroups
    .map((g) => ({
      id: g.id,
      name: g.name,
      adminName: adminNames.get(g.admin_id) ?? "—",
      members: memberCounts.get(g.id) ?? 0,
      predictions: predCounts.get(g.id) ?? 0,
      accessMode: g.access_mode as "open" | "protected",
      createdAt: g.created_at,
    }))
    .sort((a, b) => b.members - a.members);

  const metricCards = [
    { label: t("metrics.totalUsers"), value: String(m.total_users) },
    { label: t("metrics.totalGroups"), value: String(m.total_groups) },
    { label: t("metrics.totalMembers"), value: String(m.total_members) },
    { label: t("metrics.avgMembers"), value: avgMembers },
    { label: t("metrics.totalPredictions"), value: String(m.total_predictions) },
    { label: t("metrics.avgPredictions"), value: avgPredictions },
    { label: t("metrics.totalPowers"), value: String(m.total_powers) },
    { label: t("metrics.totalStickers"), value: String(m.total_stickers) },
    { label: t("metrics.matchesFinished"), value: String(m.matches_finished) },
    { label: t("metrics.matchesScheduled"), value: String(m.matches_scheduled) },
    { label: t("metrics.matchesLive"), value: String(m.matches_live) },
    { label: t("metrics.nextMatch"), value: nextMatchLabel, small: true },
  ];

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div>
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            {t("backToDashboard")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{t("title")}</h1>
        </div>

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metricCards.map((card, i) => (
            <div
              key={card.label}
              className="rounded-xl border border-dark-600 bg-dark-800 p-4"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <p
                className={`font-bold tabular-nums text-emerald-400 ${card.small ? "text-sm" : "font-mono text-2xl"}`}
              >
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{card.label}</p>
            </div>
          ))}
        </section>

        {/* Match management */}
        <MatchManagement
          matches={matches}
          locale={locale}
          profileTimeZone={profileTimeZone}
        />

        {/* Groups overview */}
        <GroupsOverview groups={saGroups} locale={locale} />
      </div>
    </main>
  );
}
