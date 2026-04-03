"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import TimezoneField from "@/components/timezone-field";
import { createClient } from "@/lib/supabase/client";
import { syncGroupMembersDisplayName } from "@/lib/display-name";
import { DEFAULT_TIMEZONE } from "@/lib/format-match-time";

const MIN = 2;
const MAX = 30;

type Props = {
  initialDisplayName: string;
  initialTimezone: string;
  email: string;
};

export default function ProfileForm({ initialDisplayName, initialTimezone, email }: Props) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState(initialDisplayName);
  const [timezone, setTimezone] = useState(initialTimezone || DEFAULT_TIMEZONE);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
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
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      setError(upsertError.message);
      setSubmitting(false);
      return;
    }

    const { error: syncError } = await syncGroupMembersDisplayName(supabase, user.id, trimmed);
    if (syncError) {
      setError(syncError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSaved(true);
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
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="profile-display-name">
            {t("displayNameLabel")}
          </label>
          <input
            id="profile-display-name"
            type="text"
            autoComplete="nickname"
            value={name}
            onChange={(e) => {
              setSaved(false);
              setName(e.target.value.slice(0, MAX));
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
            required
            minLength={MIN}
            maxLength={MAX}
          />
        </div>
        <TimezoneField translationNamespace="Profile" value={timezone} onChange={setTimezone} />
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">{t("emailLabel")}</span>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{email}</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="text-sm font-medium text-emerald-700">{t("saved")}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400 sm:w-auto"
        >
          {submitting ? t("saving") : t("save")}
        </button>
      </form>

      <div className="border-t border-slate-200 pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dangerZone")}</p>
        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={signingOut}
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100 disabled:opacity-60"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}
