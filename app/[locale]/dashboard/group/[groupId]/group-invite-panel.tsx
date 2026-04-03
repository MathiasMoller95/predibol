"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
  slug: string;
};

export default function GroupInvitePanel({ locale, slug }: Props) {
  const t = useTranslations("GroupHub");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");

  const fullUrl = useMemo(() => `${origin}/${locale}/join/${slug}`, [origin, locale, slug]);

  const whatsappHref = useMemo(() => {
    const text = `Join my Predibol group! ${fullUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [fullUrl]);

  useEffect(() => {
    if (!copied) return;
    const h = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(h);
  }, [copied]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:w-auto"
        >
          {t("inviteFriends")}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 rounded-md bg-white p-3 font-mono text-xs text-slate-800 ring-1 ring-slate-200 break-all sm:text-sm">
              {fullUrl}
            </div>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              {copied ? t("copied") : t("copyLink")}
            </button>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 sm:w-auto"
          >
            {t("shareWhatsApp")}
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            {t("closeInvite")}
          </button>
        </div>
      )}
    </div>
  );
}
