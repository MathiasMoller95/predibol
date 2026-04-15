import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ToastProvider } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/server";
import { resolveDisplayName } from "@/lib/display-name";
import Navbar from "./components/navbar";

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const tCommon = await getTranslations("Common");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();

  const displayName = resolveDisplayName(profile?.display_name, null, user.email);

  return (
    <>
      <Navbar displayName={displayName} email={user.email ?? ""} locale={locale} userId={user.id} />
      <ToastProvider>
        <div className="min-h-0">{children}</div>
        <footer className="border-t border-dark-600/40 py-5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 text-center text-xs text-slate-500">
            <Link href={`/${locale}/privacy`} className="hover:text-slate-400 hover:underline">
              {tCommon("footerPrivacy")}
            </Link>
            <span aria-hidden className="text-slate-600">
              ·
            </span>
            <Link href={`/${locale}/terms`} className="hover:text-slate-400 hover:underline">
              {tCommon("footerTerms")}
            </Link>
          </div>
        </footer>
      </ToastProvider>
    </>
  );
}

