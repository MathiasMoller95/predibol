"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
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

function mapSignupError(rawMessage: string, t: (key: string) => string): string {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already") ||
    lower.includes("already exists")
  ) {
    return t("emailTaken");
  }
  return t("genericError");
}

export function SignupForm() {
  const t = useTranslations("SignupPage");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loginHref = useMemo(() => {
    const base = `/${locale}/login`;
    if (!nextParam) return base;
    const safe = getSafeNextPath(nextParam, locale);
    if (!safe) return base;
    return `${base}?next=${encodeURIComponent(safe)}`;
  }, [locale, nextParam]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (email !== confirmEmail) {
      setError(t("emailsMismatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);

    const callbackUrl = new URL(`/${locale}/auth/callback`, window.location.origin);
    const safeNext = getSafeNextPath(nextParam, locale);
    if (safeNext) {
      callbackUrl.searchParams.set("next", safeNext);
    }

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(mapSignupError(signUpError.message, t));
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold tracking-wide text-emerald-700">Predibol</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("successTitle")}</h1>
          <p className="mt-4 text-sm text-slate-600">{t("successMessage")}</p>
          <p className="mt-2 text-sm text-slate-500">{t("checkSpam")}</p>
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href={loginHref} className="font-medium text-emerald-700 hover:text-emerald-800">
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">Predibol</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("title")}</h1>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="su-email">
              {t("emailLabel")}
            </label>
            <input
              id="su-email"
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
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="su-email2">
              {t("confirmEmailLabel")}
            </label>
            <input
              id="su-email2"
              type="email"
              value={confirmEmail}
              onChange={(event) => {
                setConfirmEmail(event.target.value);
                if (error) setError(null);
              }}
              placeholder={t("confirmEmailPlaceholder")}
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="su-pw">
              {t("passwordLabel")}
            </label>
            <input
              id="su-pw"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              placeholder={t("passwordPlaceholder")}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="su-pw2">
              {t("confirmPasswordLabel")}
            </label>
            <input
              id="su-pw2"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (error) setError(null);
              }}
              placeholder={t("confirmPasswordPlaceholder")}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {isSubmitting ? t("creatingButton") : t("signupButton")}
          </button>

          <p className="text-center text-sm text-slate-600">
            {t("hasAccount")}{" "}
            <Link href={loginHref} className="font-medium text-emerald-700 hover:text-emerald-800">
              {t("loginLink")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
