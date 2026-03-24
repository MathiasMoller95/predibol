import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

type Props = {
  params: { locale: string };
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{t("dashboardTitle")}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {t("loggedInAs")}: <span className="font-medium text-slate-900">{user.email}</span>
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
