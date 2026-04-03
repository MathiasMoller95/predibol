"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

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
      <main className="min-h-screen bg-dark-900 px-4 py-10">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8">
          <p className="text-xl font-bold text-emerald-400">Predibol</p>
          <h1 className="mt-3 text-2xl font-bold text-white">{t("successTitle")}</h1>
          <p className="mt-4 rounded-lg border border-emerald-800 bg-emerald-900/30 p-3 text-sm text-emerald-300">{t("successMessage")}</p>
          <p className="mt-2 text-sm text-slate-400">{t("checkSpam")}</p>
          <p className="mt-6 text-center text-sm text-slate-400">
            <Link href={loginHref} className="font-medium text-emerald-400 hover:text-emerald-300">
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8">
        <p className="text-xl font-bold text-emerald-400">Predibol</p>
        <h1 className="mt-3 text-2xl font-bold text-white">{t("title")}</h1>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="su-email">
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
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="su-email2">
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
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="su-pw">
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
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="su-pw2">
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
              className={inputClass}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-3 text-sm text-red-300">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[48px] w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {isSubmitting ? t("creatingButton") : t("signupButton")}
          </button>

          <p className="text-center text-sm text-slate-400">
            {t("hasAccount")}{" "}
            <Link href={loginHref} className="font-medium text-emerald-400 hover:text-emerald-300">
              {t("loginLink")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
