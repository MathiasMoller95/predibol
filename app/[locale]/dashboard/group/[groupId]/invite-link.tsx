"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
  slug: string;
};

export default function InviteLink({ locale, slug }: Props) {
  const t = useTranslations("Groups.groupAdmin");
  const [copied, setCopied] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // Set NEXT_PUBLIC_SITE_URL in `.env.local` for dev (e.g. http://localhost:3000).
  const origin = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");

  const fullUrl = useMemo(() => `${origin}/${locale}/join/${slug}`, [origin, locale, slug]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const handle = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(handle);
  }, [copied]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
    } catch {
      // Best-effort: if clipboard fails, do nothing.
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex-1 rounded-md bg-slate-100 p-3 text-sm font-mono text-slate-800 break-all">{fullUrl}</div>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
      >
        {copied ? t("copied") : t("copyLink")}
      </button>
    </div>
  );
}

