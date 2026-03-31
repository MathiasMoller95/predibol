import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinGroupButton from "./join-group-button";

type Props = {
  params: { locale: string; slug: string };
  searchParams: { autoJoin?: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
};

export default async function JoinGroupPage({ params, searchParams }: Props) {
  const { locale, slug } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Groups");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = `/${locale}/join/${slug}?autoJoin=1`;
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,name,slug")
    .eq("slug", slug)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as GroupRecord;

  const autoJoin = searchParams.autoJoin === "1";

  if (user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", typedGroup.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      redirect(`/${locale}/dashboard/group/${typedGroup.id}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{t("join.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("join.groupNameLabel", { name: typedGroup.name })}</p>
        <JoinGroupButton groupId={typedGroup.id} slug={typedGroup.slug} autoJoin={autoJoin} isLoggedIn={Boolean(user)} />
      </section>
    </main>
  );
}
