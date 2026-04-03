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

  const { data: profile } = await supabase.from("profiles").select("display_name,timezone").eq("id", user.id).maybeSingle();

  const initial =
    profile?.display_name?.trim() || emailPrefix(user.email);

  const initialTimezone = (profile?.timezone as string | undefined)?.trim() || "Europe/Madrid";

  return (
    <main className="min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8 sm:p-8">
        <p className="text-center text-xl font-bold text-emerald-400">Predibol</p>
        <h1 className="mt-4 text-2xl font-bold text-white">{t("title")}</h1>
        <div className="mt-6">
          <ProfileForm initialDisplayName={initial} initialTimezone={initialTimezone} email={user.email ?? ""} />
        </div>
      </section>
    </main>
  );
}
