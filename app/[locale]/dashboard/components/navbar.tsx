"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/auth";

type Props = {
  displayName: string;
  email: string;
  locale: string;
  userId: string;
};

export default function Navbar({ displayName, email, locale, userId }: Props) {
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
    <header className="sticky top-0 z-50 border-b border-dark-600 bg-dark-800">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <Link
            href={`/${locale}/dashboard`}
            aria-label="Predibol"
            className="flex shrink-0 items-center gap-1.5 text-lg font-bold tracking-tight transition-colors hover:text-emerald-300"
          >
            <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
              <rect width="64" height="64" rx="12" fill="#0A0E14" />
              <text x="8" y="46" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="42">
                <tspan fill="#10B981">P</tspan>
                <tspan fill="#FFF">b</tspan>
              </text>
            </svg>
            <span className="hidden text-emerald-400 sm:inline">Predibol</span>
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="shrink-0 text-sm text-slate-400 transition-colors hover:text-white"
          >
            {t("myGroups")}
          </Link>
          <Link
            href={`/${locale}/dashboard/discover`}
            className="shrink-0 text-sm text-slate-400 transition-colors hover:text-white"
          >
            {t("discover")}
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          {isSuperAdmin(userId) && (
            <Link
              href={`/${locale}/dashboard/super-admin`}
              className="hidden shrink-0 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300 sm:inline"
            >
              {t("superAdmin")}
            </Link>
          )}
          <Link
            href={`/${locale}/dashboard/profile`}
            title={email}
            aria-label={`${t("profile")}: ${displayName}`}
            className="min-w-0 truncate text-sm text-slate-400 transition-colors hover:text-white"
          >
            {displayName}
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={isSigningOut}
            className="shrink-0 rounded-lg border border-dark-500 px-3 py-1.5 text-sm text-slate-500 transition hover:border-dark-500 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
