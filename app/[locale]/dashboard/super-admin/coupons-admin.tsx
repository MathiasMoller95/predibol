"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  max_uses: number | null;
  times_used: number;
  applicable_tiers: string[];
  expires_at: string | null;
  active: boolean;
};

export default function CouponsAdmin() {
  const t = useTranslations("SuperAdmin.coupons");
  const { showToast } = useToast();
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [ctype, setCtype] = useState<"percent" | "fixed" | "free">("percent");
  const [value, setValue] = useState(10);
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [tiers, setTiers] = useState({ partido: true, partidazo: true, corpo: true });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/coupons");
    const data = (await res.json()) as { coupons?: CouponRow[] };
    setRows(data.coupons ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCoupon() {
    const applicable = [
      ...(tiers.partido ? (["partido"] as const) : []),
      ...(tiers.partidazo ? (["partidazo"] as const) : []),
      ...(tiers.corpo ? (["corpo"] as const) : []),
    ];
    if (applicable.length === 0) {
      showToast(t("error"), "error");
      return;
    }
    const res = await fetch("/api/super-admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type: ctype,
        value: ctype === "free" ? 0 : value,
        max_uses: maxUses.trim() ? Number(maxUses) : null,
        applicable_tiers: applicable,
        expires_at: expires.trim() ? new Date(expires).toISOString() : null,
      }),
    });
    if (!res.ok) {
      showToast(t("error"), "error");
      return;
    }
    showToast(t("saved"), "success");
    setCode("");
    await load();
  }

  async function toggle(id: string, active: boolean) {
    const res = await fetch(`/api/super-admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (!res.ok) showToast(t("error"), "error");
    else void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    const res = await fetch(`/api/super-admin/coupons/${id}`, { method: "DELETE" });
    if (!res.ok) showToast(t("error"), "error");
    else {
      showToast(t("deleted"), "success");
      void load();
    }
  }

  function statusLabel(row: CouponRow): string {
    if (!row.active) return t("inactive");
    if (row.expires_at && new Date(row.expires_at) < new Date()) return t("statusExpired");
    if (row.max_uses != null && row.times_used >= row.max_uses) return t("statusMaxed");
    return t("statusActive");
  }

  return (
    <section className="rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">{t("title")}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-400">{t("code")}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 font-mono text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">{t("type")}</label>
          <select
            value={ctype}
            onChange={(e) => setCtype(e.target.value as typeof ctype)}
            className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          >
            <option value="percent">{t("typePercent")}</option>
            <option value="fixed">{t("typeFixed")}</option>
            <option value="free">{t("typeFree")}</option>
          </select>
        </div>
        {ctype !== "free" ? (
          <div>
            <label className="text-xs text-slate-400">{t("value")}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
            />
          </div>
        ) : null}
        <div>
          <label className="text-xs text-slate-400">{t("maxUses")}</label>
          <input
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">{t("expires")}</label>
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="mt-1 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-400">{t("tiers")}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-200">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={tiers.partido} onChange={(e) => setTiers((p) => ({ ...p, partido: e.target.checked }))} />
              Partido
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={tiers.partidazo} onChange={(e) => setTiers((p) => ({ ...p, partidazo: e.target.checked }))} />
              Partidazo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={tiers.corpo} onChange={(e) => setTiers((p) => ({ ...p, corpo: e.target.checked }))} />
              Corpo
            </label>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void createCoupon()}
        className={`mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 ${PRIMARY_BUTTON_CLASSES}`}
      >
        {t("create")}
      </button>

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-slate-400">…</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-dark-600 text-xs uppercase text-slate-500">
                <th className="py-2">{t("listCode")}</th>
                <th className="py-2">{t("listType")}</th>
                <th className="py-2">{t("listValue")}</th>
                <th className="py-2">{t("listUses")}</th>
                <th className="py-2">{t("listTiers")}</th>
                <th className="py-2">{t("listExpires")}</th>
                <th className="py-2">{t("listStatus")}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-dark-700">
                  <td className="py-2 font-mono text-white">{r.code}</td>
                  <td className="py-2">{r.type}</td>
                  <td className="py-2">{r.type === "percent" ? `${r.value}%` : r.type === "fixed" ? `$${(r.value / 100).toFixed(2)}` : "—"}</td>
                  <td className="py-2">
                    {r.times_used}/{r.max_uses == null ? t("usesUnlimited") : r.max_uses}
                  </td>
                  <td className="py-2">{(r.applicable_tiers ?? []).join(", ")}</td>
                  <td className="py-2">{r.expires_at ? r.expires_at.slice(0, 10) : "—"}</td>
                  <td className="py-2">{statusLabel(r)}</td>
                  <td className="py-2 text-right">
                    <button type="button" className="mr-2 text-emerald-400 hover:underline" onClick={() => void toggle(r.id, r.active)}>
                      {t("toggle")}
                    </button>
                    <button type="button" className="text-red-400 hover:underline" onClick={() => void remove(r.id)}>
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
