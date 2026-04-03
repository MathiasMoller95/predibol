import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiscoverGroupList, { type DiscoverGroupRow } from "./discover-group-list";

type Props = {
  params: { locale: string };
};

type GroupWithCount = {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  description: string | null;
  admin_id: string;
  is_public: boolean;
  group_members: { count: number }[] | null;
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

  const { data: rawGroups } = await supabase
    .from("groups")
    .select("id,name,slug,primary_color,description,admin_id,is_public, group_members(count)")
    .eq("is_public", true);

  const withCounts = ((rawGroups ?? []) as unknown as GroupWithCount[])
    .map((g) => {
      const agg = g.group_members;
      const c = Array.isArray(agg) && agg[0] != null && typeof agg[0].count === "number" ? agg[0].count : 0;
      return { ...g, memberCount: c };
    })
    .sort((a, b) => b.memberCount - a.memberCount);

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
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>

        <DiscoverGroupList locale={locale} currentUserId={user.id} userEmail={user.email ?? undefined} groups={groups} />
      </section>
    </main>
  );
}
