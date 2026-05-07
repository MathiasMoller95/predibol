"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleUser, LogOut, User } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function onLogout() {
    if (isSigningOut) return;
    setIsSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    Sentry.setUser(null);
    router.push(`/${locale}/login`);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

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

          {/* Desktop: keep current layout */}
          <Link
            href={`/${locale}/dashboard/profile`}
            title={email}
            aria-label={`${t("profile")}: ${displayName}`}
            className="hidden min-w-0 truncate text-sm text-slate-400 transition-colors hover:text-white md:block"
          >
            {displayName}
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={isSigningOut}
            className="hidden shrink-0 rounded-lg border border-dark-500 px-3 py-1.5 text-sm text-slate-500 transition hover:border-dark-500 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
          >
            {t("logout")}
          </button>

          {/* Mobile: compact user menu */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t("profile")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-lg border border-dark-500 bg-dark-900/40 text-slate-300 transition hover:text-white"
            >
              <CircleUser className="h-5 w-5" aria-hidden />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-xl border border-dark-500 bg-dark-900 shadow-2xl"
              >
                <div className="border-b border-dark-600 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{email}</p>
                </div>
                <Link
                  role="menuitem"
                  href={`/${locale}/dashboard/profile`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 transition hover:bg-dark-800 hover:text-white"
                >
                  <User className="h-4 w-4 text-slate-400" aria-hidden />
                  {t("profile")}
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void onLogout();
                  }}
                  disabled={isSigningOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-dark-800 hover:text-white disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4 text-slate-400" aria-hidden />
                  {t("logout")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
