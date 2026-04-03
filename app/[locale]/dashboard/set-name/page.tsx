import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetNameForm from "./set-name-form";

type Props = {
  params: { locale: string };
};

export default async function SetNamePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("SetName");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();

  if (profile?.display_name?.trim()) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8 sm:p-8">
        <p className="text-center text-xl font-bold text-emerald-400">Predibol</p>
        <h1 className="mt-4 text-center text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 text-center text-sm text-slate-400">{t("subtitle")}</p>
        <SetNameForm />
      </section>
    </main>
  );
}
