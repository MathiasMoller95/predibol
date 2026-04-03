import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailPrefix } from "@/lib/display-name";
import ProfileForm from "./profile-form";

type Props = {
  params: { locale: string };
};

export default async function ProfilePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();

  const initial =
    profile?.display_name?.trim() || emailPrefix(user.email);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-md rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="text-center text-sm font-semibold tracking-tight text-emerald-700">Predibol</p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <div className="mt-6">
          <ProfileForm initialDisplayName={initial} email={user.email ?? ""} />
        </div>
      </section>
    </main>
  );
}
