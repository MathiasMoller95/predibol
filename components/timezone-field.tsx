"use client";

import { useId, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ALL_TIMEZONE_IDS, TIMEZONE_GROUPS } from "@/lib/timezone-options";

type Props = {
  translationNamespace: "SetName" | "Profile";
  value: string;
  onChange: (timezone: string) => void;
};

export default function TimezoneField({ translationNamespace, value, onChange }: Props) {
  const selectId = useId();
  const t = useTranslations(translationNamespace);
  const locale = useLocale();

  const previewTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone: value,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    } catch {
      return "—";
    }
  }, [locale, value]);

  const extra = !ALL_TIMEZONE_IDS.includes(value);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={selectId}>
        {t("timezoneLabel")}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-200 transition focus:border-emerald-500 focus:ring-2"
      >
        {extra ? (
          <option value={value}>{value}</option>
        ) : null}
        {TIMEZONE_GROUPS.map((group) => (
          <optgroup key={group.region} label={group.region}>
            {group.zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-600">{t("timezonePreview", { time: previewTime })}</p>
    </div>
  );
}
