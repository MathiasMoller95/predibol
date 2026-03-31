"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  locale: string;
};

export default function Navbar({ email, locale }: Props) {
  const t = useTranslations("Navbar");
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function onLogout() {
    if (isSigningOut) return;
    setIsSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={`/${locale}/dashboard`}
          aria-label={t("myGroups")}
          className="font-semibold tracking-tight text-emerald-700 hover:text-emerald-800"
        >
          Predibol
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-sm text-slate-500">{email}</span>
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={isSigningOut}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}

