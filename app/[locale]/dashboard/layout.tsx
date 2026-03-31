import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <>
      <Navbar email={user.email ?? ""} locale={locale} />
      <div className="pt-14">{children}</div>
    </>
  );
}

