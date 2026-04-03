import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import GroupInvitePanel from "./group-invite-panel";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
  admin_id: string;
  primary_color: string | null;
};

type GroupMemberRecord = {
  id: string;
  user_id: string;
  display_name: string;
};

export default async function GroupHubPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const th = await getTranslations("GroupHub");
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,name,slug,admin_id,primary_color")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as GroupRecord;

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", typedGroup.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = typedGroup.admin_id === user.id;
  if (!isAdmin && !membership) {
    redirect(`/${locale}/dashboard`);
  }

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("id,user_id,display_name")
    .eq("group_id", typedGroup.id)
    .order("joined_at", { ascending: true });

  const members = (memberRows ?? []) as GroupMemberRecord[];
  const memberCount = members.length;
  const accent = typedGroup.primary_color ?? "#16a34a";

  const actionCards = [
    {
      href: `/${locale}/dashboard/group/${typedGroup.id}/predict`,
      emoji: "⚽",
      titleKey: "actionPlay" as const,
      descKey: "playDescription" as const,
      show: true,
    },
    {
      href: `/${locale}/dashboard/group/${typedGroup.id}/leaderboard`,
      emoji: "🏆",
      titleKey: "actionRanking" as const,
      descKey: "rankingDescription" as const,
      show: true,
    },
    {
      href: `/${locale}/dashboard/group/${typedGroup.id}/picks`,
      emoji: "👑",
      titleKey: "actionPicks" as const,
      descKey: "picksDescription" as const,
      show: true,
    },
    {
      href: `/${locale}/dashboard/group/${typedGroup.id}/admin`,
      emoji: "⚙️",
      titleKey: "actionAdmin" as const,
      descKey: "adminDescription" as const,
      show: isAdmin,
    },
  ].filter((c) => c.show);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-3xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <Link href={`/${locale}/dashboard`} className="text-sm font-medium text-slate-500 hover:text-slate-700">
          {common("backToGroups")}
        </Link>

        <div className="mt-4 border-l-4 pl-4" style={{ borderColor: accent }}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900">{typedGroup.name}</h1>
            {isAdmin ? (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                {th("adminBadge")}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            👥 {th("memberCount", { count: memberCount })}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {card.emoji}
              </span>
              <span className="mt-2 text-sm font-semibold text-slate-900">{th(card.titleKey)}</span>
              <span className="mt-1 text-xs text-slate-600 leading-snug">{th(card.descKey)}</span>
            </Link>
          ))}
        </div>

        <GroupInvitePanel locale={locale} slug={typedGroup.slug} />

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">{th("members")}</h2>
          {members.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {members.map((member) => {
                const isRowAdmin = member.user_id === typedGroup.admin_id;
                const isSelf = member.user_id === user.id;
                return (
                  <li
                    key={member.id}
                    className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      isSelf ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <span className="font-medium text-slate-900">{member.display_name}</span>
                    {isRowAdmin ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900">
                        {th("adminBadge")}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">{th("noMembers")}</p>
          )}
        </div>
      </section>
    </main>
  );
}
