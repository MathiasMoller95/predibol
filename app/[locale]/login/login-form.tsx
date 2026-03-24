"use client";

import { FormEvent, useState } from "react";
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

export function LoginForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const callbackUrl = new URL(`/${locale}/auth/callback`, window.location.origin);
    const nextPath = getSafeNextPath(searchParams.get("next"), locale);

    if (nextPath) {
      callbackUrl.searchParams.set("next", nextPath);
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setIsSent(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("loginSubtitle")}</p>

        {isSent ? (
          <p className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
            {t("checkEmailConfirmation")}
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
                {t("emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                autoComplete="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {isSubmitting ? t("sendingButton") : t("sendLinkButton")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
