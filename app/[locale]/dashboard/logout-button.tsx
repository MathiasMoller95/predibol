"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onLogout() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={isLoading}
      className="rounded-lg border border-dark-500 bg-dark-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? t("loggingOutButton") : t("logoutButton")}
    </button>
  );
}
