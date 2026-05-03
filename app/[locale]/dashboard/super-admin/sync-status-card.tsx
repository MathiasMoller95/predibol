"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import { useToast } from "@/components/ui/toast-provider";

export type SyncState = {
  last_sync_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  api_calls_remaining: number | null;
  next_planned_poll_seconds: number | null;
};

function formatAge(msAgo: number): string {
  if (!Number.isFinite(msAgo) || msAgo < 0) return "—";
  const s = Math.floor(msAgo / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export default function SyncStatusCard({ initialState }: { initialState: SyncState }) {
  const t = useTranslations("SuperAdmin");
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [state, setState] = useState<SyncState>(initialState);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function refreshState() {
    const { data, error } = await supabase
      .from("api_football_sync_state")
      .select("last_sync_at,last_ok_at,last_error,api_calls_remaining,next_planned_poll_seconds")
      .eq("id", 1)
      .maybeSingle();
    if (error) return;
    setState({
      last_sync_at: (data?.last_sync_at as string | null) ?? null,
      last_ok_at: (data?.last_ok_at as string | null) ?? null,
      last_error: (data?.last_error as string | null) ?? null,
      api_calls_remaining: (data?.api_calls_remaining as number | null) ?? null,
      next_planned_poll_seconds: (data?.next_planned_poll_seconds as number | null) ?? null,
    });
  }

  const lastSyncAge = (() => {
    if (!state.last_sync_at) return "—";
    const ms = Date.now() - new Date(state.last_sync_at).getTime();
    return formatAge(ms);
  })();

  const approxNext = (() => {
    if (!state.last_sync_at) return "—";
    const ms = Date.now() - new Date(state.last_sync_at).getTime();
    const s = Math.max(0, 60 - (Math.floor(ms / 1000) % 60));
    return `${s}s`;
  })();

  // Ensure UI updates each second (tick is used to re-render)
  void tick;

  return (
    <section className="rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t("sync.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {t("sync.lastSync")} {lastSyncAge}
            {state.last_error ? (
              <span className="ml-2 text-red-400">· {t("sync.statusError")}</span>
            ) : (
              <span className="ml-2 text-emerald-400">· {t("sync.statusActive")}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/super-admin/sync-matches", {
                  method: "POST",
                  credentials: "same-origin",
                });
                if (!res.ok) {
                  showToast("Sync failed", "error");
                } else {
                  showToast("Sync started", "success");
                }
                await refreshState();
              } finally {
                setBusy(false);
              }
            }}
            className={`rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
          >
            {busy ? "..." : t("sync.forceSync")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => refreshState()}
            className="rounded-lg border border-dark-500 px-3 py-2 text-sm text-slate-300 hover:bg-dark-700 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info label={t("sync.apiRemaining")} value={state.api_calls_remaining != null ? String(state.api_calls_remaining) : "—"} />
        <Info label={t("sync.nextScheduled")} value={approxNext} />
        <Info label={t("sync.pollInterval")} value={state.next_planned_poll_seconds != null ? `${state.next_planned_poll_seconds}s` : "—"} />
        <Info label={t("sync.lastError")} value={state.last_error ? state.last_error.slice(0, 80) : "—"} />
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-dark-600 bg-dark-900/30 p-3">
      <p className="font-mono text-sm font-bold text-emerald-400">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

