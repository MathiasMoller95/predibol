"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

type Props = {
  groupName: string;
};

export default function DangerZone({ groupName }: Props) {
  const t = useTranslations("AdminPage");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  const canDelete = confirmInput.trim() === groupName;

  async function handleDelete() {
    if (!canDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`./admin/delete`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t("error"), "error");
        return;
      }
      showToast(t("dangerZone.deleted"), "success");
      router.replace(`/${locale}/dashboard`);
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="mt-10 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="text-lg font-semibold text-white">{t("dangerZone.title")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("dangerZone.confirmWarning")}</p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-4 rounded-lg border border-red-500/50 bg-transparent px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
        >
          {t("dangerZone.deleteGroup")}
        </button>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="animate-page-in relative mx-4 w-full max-w-sm rounded-xl bg-[#111720] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-3 top-3 rounded-md border border-dark-600 bg-dark-900/40 px-2 py-1 text-sm font-semibold text-slate-300 hover:bg-dark-700"
              aria-label="Close"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-white">{t("dangerZone.confirmTitle")}</h3>
            <p className="mt-3 text-sm text-slate-400">{t("dangerZone.confirmWarning")}</p>

            <label className="mt-4 block text-xs font-medium text-slate-400">
              {t("dangerZone.typeGroupName")}
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={groupName}
              className="mt-1.5 w-full rounded-lg border border-dark-500 bg-dark-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-dark-500 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-dark-700"
              >
                {t("dangerZone.cancel")}
              </button>
              <button
                type="button"
                disabled={!canDelete || isDeleting}
                onClick={() => void handleDelete()}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? "..." : t("dangerZone.deletePermanently")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
