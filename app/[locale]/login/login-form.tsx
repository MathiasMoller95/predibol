"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getSafeNextPath(next: string | null, locale: string) {
  if (!next) {
    return null;
  }

  if (!next.startsWith(`/${locale}/`)) {
    return null;
  }

  if (next.startsWith("//")) {
    return null;
  }

  return next;
}

function mapLoginError(rawMessage: string, t: (key: string) => string): string {
  const lower = rawMessage.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return t("invalidCredentials");
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return t("emailNotVerified");
  }

  return t("genericError");
}

export function LoginForm() {
  const t = useTranslations("LoginPage");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupHref = useMemo(() => {
    const base = `/${locale}/signup`;
    if (!nextParam) return base;
    const safe = getSafeNextPath(nextParam, locale);
    if (!safe) return base;
    return `${base}?next=${encodeURIComponent(safe)}`;
  }, [locale, nextParam]);

  useEffect(() => {
    if (urlError !== "auth_failed") {
      return;
    }

    setError(t("genericError"));
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    const qs = url.searchParams.toString();
    window.history.replaceState(null, "", url.pathname + (qs ? `?${qs}` : ""));
  }, [urlError, t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(mapLoginError(signInError.message, t));
      return;
    }

    const nextPath = getSafeNextPath(nextParam, locale);
    router.replace(nextPath ?? `/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">Predibol</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("title")}</h1>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              placeholder={t("emailPlaceholder")}
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              {t("passwordLabel")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              placeholder={t("passwordPlaceholder")}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
            />
          </div>

          {error ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <p className="min-w-0">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 rounded px-1 text-rose-700 hover:bg-rose-100"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {isSubmitting ? t("loggingInButton") : t("loginButton")}
          </button>

          <p className="text-center text-sm text-slate-600">
            {t("noAccount")}{" "}
            <Link href={signupHref} className="font-medium text-emerald-700 hover:text-emerald-800">
              {t("signupLink")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
