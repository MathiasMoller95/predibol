"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";

export type CopyPredictionOption = {
  groupId: string;
  groupName: string;
  copyableCount: number;
};

type Props = {
  targetGroupId: string;
  options: CopyPredictionOption[];
};

export default function CopyPredictionsBanner({ targetGroupId, options }: Props) {
  const t = useTranslations("Predictions.copy");
  const router = useRouter();
  const { showToast } = useToast();

  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [sourceId, setSourceId] = useState(options[0]?.groupId ?? "");

  const selected = useMemo(
    () => options.find((o) => o.groupId === sourceId) ?? options[0],
    [options, sourceId],
  );

  if (options.length === 0 || dismissed || done) {
    return null;
  }

  const groupName = selected?.groupName ?? "";

  async function onCopy() {
    if (!selected) return;
    setPending(true);
    try {
      const res = await fetch(`/api/groups/${targetGroupId}/copy-predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceGroupId: selected.groupId }),
      });
      const data = (await res.json()) as { copiedCount?: number; error?: string };
      if (!res.ok) {
        showToast(data.error ?? t("error"), "error");
        return;
      }
      const n = data.copiedCount ?? 0;
      showToast(t("successToast", { count: n }), "success");
      setDone(true);
      router.refresh();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gpri/30 bg-gpri/5 p-4 sm:p-5">
      <p className="text-sm font-medium text-white">
        {t("bannerPrompt", { groupName })}
      </p>

      {options.length > 1 ? (
        <label className="mt-3 block text-sm text-slate-400">
          <span className="mb-1 block">{t("copyFrom")}</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-dark-500 bg-dark-900 px-3 py-2 text-sm text-white outline-none focus:border-gpri focus:ring-1 focus:ring-gpri/50"
          >
            {options.map((o) => (
              <option key={o.groupId} value={o.groupId}>
                {o.groupName} ({o.copyableCount})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void onCopy()}
          className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
        >
          {pending ? t("copying") : t("copyButton")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setDismissed(true)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-dark-500 bg-dark-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-dark-600 disabled:opacity-60"
        >
          {t("dismissButton")}
        </button>
      </div>
    </div>
  );
}
