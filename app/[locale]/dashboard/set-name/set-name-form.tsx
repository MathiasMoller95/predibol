"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import TimezoneField from "@/components/timezone-field";
import { createClient } from "@/lib/supabase/client";
import { syncGroupMembersDisplayName } from "@/lib/display-name";
import { DEFAULT_TIMEZONE, getBrowserTimeZone } from "@/lib/format-match-time";

const MIN = 2;
const MAX = 30;

export default function SetNameForm() {
  const t = useTranslations("SetName");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTimezone(getBrowserTimeZone());
  }, []);

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

    router.replace(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={(e) => void onSubmit(e)}>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="display-name">
          {t("nameLabel")}
        </label>
        <input
          id="display-name"
          type="text"
          autoComplete="nickname"
          value={name}
          placeholder={t("namePlaceholder")}
          onChange={(e) => setName(e.target.value.slice(0, MAX))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
          required
          minLength={MIN}
          maxLength={MAX}
        />
      </div>
      <TimezoneField translationNamespace="SetName" value={timezone} onChange={setTimezone} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {submitting ? t("saving") : t("continue")}
      </button>
    </form>
  );
}
