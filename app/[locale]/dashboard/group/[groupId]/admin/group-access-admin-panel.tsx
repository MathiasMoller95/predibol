"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import type { GroupAccessMode } from "@/types/supabase";

function randomSixDigitCode() {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

type Props = {
  groupId: string;
  initialMode: GroupAccessMode;
  initialCode: string | null;
};

export default function GroupAccessAdminPanel({ groupId, initialMode, initialCode }: Props) {
  const t = useTranslations("AccessCode");
  const { showToast } = useToast();
  const [mode, setMode] = useState<GroupAccessMode>(initialMode);
  const [code, setCode] = useState<string>(() =>
    initialMode === "protected" && initialCode && /^\d{6}$/.test(initialCode) ? initialCode : randomSixDigitCode(),
  );
  const [busy, setBusy] = useState(false);

  const persist = useCallback(
    async (nextMode: GroupAccessMode, nextCode: string | null) => {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase
        .from("groups")
        .update({
          access_mode: nextMode,
          access_code: nextCode,
        })
        .eq("id", groupId);

      if (error) {
        showToast(error.message, "error");
        setBusy(false);
        return false;
      }
      setBusy(false);
      return true;
    },
    [groupId, showToast],
  );

  async function selectOpen() {
    if (mode === "open") return;
    if (!window.confirm(t("confirmOpenSwitch"))) return;
    const ok = await persist("open", null);
    if (ok) {
      setMode("open");
      showToast(t("settingsSaved"), "success");
    }
  }

  async function selectProtected() {
    if (mode === "protected") return;
    let next = code;
    if (!/^\d{6}$/.test(next)) {
      next = randomSixDigitCode();
      setCode(next);
    }
    const ok = await persist("protected", next);
    if (ok) {
      setMode("protected");
      showToast(t("settingsSaved"), "success");
    }
  }

  async function onRegenerate() {
    const next = randomSixDigitCode();
    setCode(next);
    if (mode !== "protected") return;
    const ok = await persist("protected", next);
    if (ok) showToast(t("settingsSaved"), "success");
  }

  async function onCopyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast(t("codeCopied"), "success");
    } catch {
      showToast(t("copyFailed"), "error");
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-dark-600 bg-dark-800/80 p-5">
      <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-400">
        {mode === "open" ? `${t("open")} — ${t("openDescription")}` : `${t("protected")} — ${t("protectedDescription")}`}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void selectOpen()}
          className={`rounded-xl border border-dark-600 p-4 text-left transition-all duration-200 disabled:opacity-50 ${
            mode === "open" ? "bg-gpri/5 ring-2 ring-gpri" : "bg-[#111720]"
          }`}
        >
          <span className="text-lg" aria-hidden>
            🔓
          </span>
          <p className="mt-2 text-sm font-medium text-white">{t("open")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("openDescription")}</p>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void selectProtected()}
          className={`rounded-xl border border-dark-600 p-4 text-left transition-all duration-200 disabled:opacity-50 ${
            mode === "protected" ? "bg-gpri/5 ring-2 ring-gpri" : "bg-[#111720]"
          }`}
        >
          <span className="text-lg" aria-hidden>
            🔒
          </span>
          <p className="mt-2 text-sm font-medium text-white">{t("protected")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("protectedDescription")}</p>
        </button>
      </div>

      {mode === "protected" ? (
        <div className="mt-4 space-y-3 rounded-lg border border-dark-600 bg-dark-900/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xl tracking-widest text-gsec">{code}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCopyCode()}
              className={`rounded-lg border border-dark-500 bg-dark-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-gpri/50 ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("copyCode")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRegenerate()}
              className={`rounded-lg border border-dark-500 bg-dark-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-gpri/50 ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("regenerate")}
            </button>
          </div>
          <p className="text-xs text-slate-500">{t("shareCodeHint")}</p>
        </div>
      ) : null}
    </section>
  );
}
