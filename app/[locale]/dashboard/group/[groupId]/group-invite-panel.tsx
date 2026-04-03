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
    <div className="mt-8 rounded-xl border border-dark-600 bg-dark-700/50 p-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-dark-600 sm:w-auto"
        >
          {t("inviteFriends")}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 rounded-lg border border-dark-600 bg-dark-900 p-3 font-mono text-xs text-slate-300 break-all sm:text-sm">
              {fullUrl}
            </div>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="shrink-0 rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-dark-600"
            >
              {copied ? t("copied") : t("copyLink")}
            </button>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 sm:w-auto"
          >
            {t("shareWhatsApp")}
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
          >
            {t("closeInvite")}
          </button>
        </div>
      )}
    </div>
  );
}
