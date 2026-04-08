"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import TimezoneField from "@/components/timezone-field";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { syncGroupMembersDisplayName } from "@/lib/display-name";
import { DEFAULT_TIMEZONE } from "@/lib/format-match-time";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";

const MIN = 2;
const MAX = 30;

const inputClass =
  "w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

type Props = {
  initialDisplayName: string;
  initialTimezone: string;
  initialEmailWeeklyRecap: boolean;
  email: string;
};

export default function ProfileForm({
  initialDisplayName,
  initialTimezone,
  initialEmailWeeklyRecap,
  email,
}: Props) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(initialDisplayName);
  const [timezone, setTimezone] = useState(initialTimezone || DEFAULT_TIMEZONE);
  const [emailWeeklyRecap, setEmailWeeklyRecap] = useState(initialEmailWeeklyRecap);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function validate(raw: string): string | null {
    const trimmed = raw.trim();
    if (trimmed.length < MIN) return t("tooShort");
    if (trimmed.length > MAX) return t("tooLong");
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate(name);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const trimmed = name.trim();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: trimmed,
        timezone,
        email_weekly_recap: emailWeeklyRecap,
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      showToast(upsertError.message, "error");
      setSubmitting(false);
      return;
    }

    const { error: syncError } = await syncGroupMembersDisplayName(supabase, user.id, trimmed);
    if (syncError) {
      showToast(syncError.message, "error");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    showToast(t("saved"), "success");
    router.refresh();
  }

  async function onLogout() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  }

  return (
    <div className="space-y-8">
      <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="profile-display-name">
            {t("displayNameLabel")}
          </label>
          <input
            id="profile-display-name"
            type="text"
            autoComplete="nickname"
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, MAX));
            }}
            className={inputClass}
            required
            minLength={MIN}
            maxLength={MAX}
          />
        </div>
        <TimezoneField translationNamespace="Profile" value={timezone} onChange={setTimezone} />
        <div className="flex items-start gap-3 rounded-lg border border-dark-600 bg-dark-900/80 px-4 py-3">
          <input
            id="profile-weekly-recap"
            type="checkbox"
            checked={emailWeeklyRecap}
            onChange={(e) => setEmailWeeklyRecap(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-dark-500 bg-dark-700 text-emerald-600 focus:ring-emerald-500"
          />
          <div className="min-w-0">
            <label htmlFor="profile-weekly-recap" className="text-sm font-medium text-slate-200">
              {t("weeklyRecapLabel")}
            </label>
            <p className="mt-1 text-xs text-slate-500">{t("weeklyRecapHint")}</p>
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-300">{t("emailLabel")}</span>
          <p className="rounded-lg border border-dark-600 bg-dark-900 px-4 py-3 text-sm text-slate-400">{email}</p>
        </div>
        {error ? <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className={`min-h-[48px] w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-400 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
        >
          {submitting ? t("saving") : t("save")}
        </button>
      </form>

      <div className="border-t border-dark-600 pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dangerZone")}</p>
        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={signingOut}
          className="mt-3 rounded-lg border border-red-800/80 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}
