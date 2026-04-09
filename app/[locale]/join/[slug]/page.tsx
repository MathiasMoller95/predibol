import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinGroupButton from "./join-group-button";
import type { Metadata } from "next";

type Props = {
  params: { locale: string; slug: string };
  searchParams: { autoJoin?: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
  access_mode: "open" | "protected";
};

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const { locale, slug } = params;

  const tOg = await getTranslations({ locale, namespace: "Og" });
  const supabase = await createClient();

  const { data: group } = await supabase.from("groups").select("name").eq("slug", slug).maybeSingle();
  const groupName = ((group?.name as string | undefined) ?? "").trim() || "Predibol";

  const title = tOg("joinTitle", { groupName });
  const description = tOg("joinDescription", { groupName });
  const ogLocale = locale === "en" ? "en_US" : locale === "pt" ? "pt_BR" : "es_ES";

  const siteBase =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const ogGroupPath = `/api/og/group/${encodeURIComponent(slug)}`;
  const ogImageUrl = siteBase ? `${siteBase}${ogGroupPath}` : ogGroupPath;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Predibol",
      locale: ogLocale,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

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
    .select("id,name,slug,access_mode")
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
    <main className="min-h-screen bg-dark-900 px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8">
        <h1 className="text-2xl font-bold text-white">{t("join.title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("join.groupNameLabel", { name: typedGroup.name })}</p>
        <JoinGroupButton
          groupId={typedGroup.id}
          slug={typedGroup.slug}
          accessMode={typedGroup.access_mode}
          autoJoin={autoJoin}
          isLoggedIn={Boolean(user)}
        />
      </section>
    </main>
  );
}
