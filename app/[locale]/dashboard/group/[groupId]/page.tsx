import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRecord = {
  id: string;
  name: string;
  slug: string;
};

type GroupMemberRecord = {
  id: string;
  display_name: string;
};

export default async function GroupAdminPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Groups");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,name,slug")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typedGroup = group as GroupRecord;

  const { data: members } = await supabase
    .from("group_members")
    .select("id,display_name")
    .eq("group_id", typedGroup.id)
    .order("joined_at", { ascending: true })
    .returns<GroupMemberRecord[]>();

  const invitePath = `/${locale}/join/${typedGroup.slug}`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-2xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{typedGroup.name}</h1>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700">{t("groupAdmin.inviteLinkLabel")}</p>
          <div className="mt-2 rounded-md bg-slate-100 p-3 text-sm text-slate-800">{invitePath}</div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("groupAdmin.membersTitle")}</h2>
          {members && members.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {members.map((member) => (
                <li key={member.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  {member.display_name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">{t("groupAdmin.noMembers")}</p>
          )}
        </div>
      </section>
    </main>
  );
}
