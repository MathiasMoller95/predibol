"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export function ResetPasswordForm() {
  const t = useTranslations("ResetPasswordPage");
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (updateError) {
      setError(t("genericError"));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.replace(`/${locale}/login`);
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-dark-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8">
        <p className="text-xl font-bold text-emerald-400">Predibol</p>
        <h1 className="mt-3 text-2xl font-bold text-white">{t("title")}</h1>

        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-900/30 px-4 py-4 text-sm text-emerald-300">
            {t("successMessage")}
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-300"
                htmlFor="password"
              >
                {t("newPasswordLabel")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-300"
                htmlFor="confirm-password"
              >
                {t("confirmPasswordLabel")}
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="new-password"
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
              {isSubmitting ? t("savingButton") : t("saveButton")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
