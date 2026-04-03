import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
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
      <Navbar displayName={displayName} email={user.email ?? ""} locale={locale} />
      <div className="pt-14">{children}</div>
    </>
  );
}

