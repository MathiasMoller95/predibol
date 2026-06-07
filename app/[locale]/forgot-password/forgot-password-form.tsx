"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export function ForgotPasswordForm() {
  const t = useTranslations("ForgotPasswordPage");
  const tLogin = useTranslations("LoginPage");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const callbackUrl = new URL(`/${locale}/auth/callback`, window.location.origin);
    callbackUrl.searchParams.set("next", `/${locale}/reset-password`);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl.toString(),
    });

    setIsSubmitting(false);

    if (resetError) {
      setError(t("genericError"));
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-screen bg-dark-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8">
        <p className="text-xl font-bold text-emerald-400">Predibol</p>

        {sent ? (
          <div className="mt-6">
            <h1 className="text-2xl font-bold text-white">{t("successTitle")}</h1>
            <p className="mt-3 text-sm text-slate-400">{t("successMessage")}</p>
            <p className="mt-6 text-center text-sm text-slate-400">
              <Link
                href={`/${locale}/login`}
                className="font-medium text-emerald-400 hover:text-emerald-300"
              >
                {tLogin("loginButton")}
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-bold text-white">{t("title")}</h1>
            <p className="mt-2 text-sm text-slate-400">{t("subtitle")}</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="email">
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
                  className={inputClass}
                />
              </div>

              {error ? (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-3 text-sm text-red-300">
                  <p className="min-w-0">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 rounded px-1 text-red-300 hover:bg-red-900/50"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[48px] w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-400"
              >
                {isSubmitting ? t("sendingButton") : t("sendButton")}
              </button>

              <p className="text-center text-sm text-slate-400">
                <Link
                  href={`/${locale}/login`}
                  className="font-medium text-emerald-400 hover:text-emerald-300"
                >
                  {tLogin("loginButton")}
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
