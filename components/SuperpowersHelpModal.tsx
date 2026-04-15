"use client";

import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SuperpowersHelpModal() {
  const t = useTranslations("Powers");
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-full items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="presentation"
            onClick={close}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="superpowers-help-title"
              className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111720] p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 id="superpowers-help-title" className="text-lg font-semibold text-white">
                  {t("helpModal.title")}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  className="-mr-1 -mt-1 shrink-0 rounded p-1.5 text-lg leading-none text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-gpri/50"
                  aria-label={t("helpModal.closeAria")}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-semibold text-white">{t("helpModal.doubleDownTitle")}</p>
                  <p className="mt-1 text-sm text-gray-400">{t("helpModal.doubleDownDescription")}</p>
                </div>
                <div>
                  <p className="font-semibold text-white">{t("helpModal.spyTitle")}</p>
                  <p className="mt-1 text-sm text-gray-400">{t("helpModal.spyDescription")}</p>
                </div>
                <div>
                  <p className="font-semibold text-white">{t("helpModal.shieldTitle")}</p>
                  <p className="mt-1 text-sm text-gray-400">{t("helpModal.shieldDescription")}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded p-0.5 text-[#6B7280] transition hover:text-gray-400 active:opacity-70 focus-visible:outline focus-visible:ring-2 focus-visible:ring-gpri/50"
        aria-label={t("helpModal.openAria")}
      >
        <HelpCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {modal}
    </>
  );
}
