import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiscoverGroupList, { type DiscoverGroupRow } from "./discover-group-list";

type Props = {
  params: { locale: string };
};

export default async function DiscoverPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Discover");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: rpcRows } = await supabase.rpc("get_public_groups_with_counts");

  const withCounts = (rpcRows ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    primary_color: row.primary_color as string | null,
    description: (row.description as string | null) ?? "",
    admin_id: row.admin_id as string,
    memberCount: Number(row.member_count ?? 0),
  }));

  const ids = withCounts.map((g) => g.id);
  let memberSet = new Set<string>();
  if (ids.length > 0) {
    const { data: mems } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .in("group_id", ids);
    memberSet = new Set((mems ?? []).map((m) => m.group_id as string));
  }

  const groups: DiscoverGroupRow[] = withCounts.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    primary_color: g.primary_color,
    description: g.description ?? "",
    admin_id: g.admin_id,
    memberCount: g.memberCount,
    isMember: memberSet.has(g.id),
  }));

  return (
    <main className="animate-page-in min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>

        <DiscoverGroupList locale={locale} currentUserId={user.id} userEmail={user.email ?? undefined} groups={groups} />
      </section>
    </main>
  );
}
