"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_URL } from "@/lib/supabase/env";

export default function ReminderTestButton() {
  const t = useTranslations("AdminPage");
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function runTest() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      showToast(t("email.error"), "error");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-prediction-reminders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        emailsSent?: number;
        matchesProcessed?: number;
      };

      if (!res.ok) {
        showToast(json.error ?? t("email.error"), "error");
        setBusy(false);
        return;
      }

      const n = json.emailsSent ?? 0;
      const msg = json.message ?? "";
      showToast(`${t("email.sent")}: ${n}${msg ? ` — ${msg}` : ""}`, "success");
    } catch {
      showToast(t("email.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-dashed border-dark-500 bg-dark-900/40 p-5">
      <h2 className="text-sm font-semibold text-slate-300">{t("email.title")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("email.testNote")}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runTest()}
        className="mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-dark-500 bg-dark-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:bg-dark-700 disabled:opacity-50"
      >
        {busy ? "…" : t("email.sendReminders")}
      </button>
    </section>
  );
}
