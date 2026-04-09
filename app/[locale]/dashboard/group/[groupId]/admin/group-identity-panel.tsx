"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { extractDominantColorsFromFile } from "@/lib/extract-dominant-colors";
import { useToast } from "@/components/ui/toast-provider";

function extFromMime(m: string): string {
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/svg+xml") return "svg";
  return "png";
}

function tintFromPrimaryHex(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgba(16,185,129,0.08)";
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},0.08)`;
}

type Props = {
  groupId: string;
  initialLogoUrl: string | null;
  initialPrimary: string;
  initialSecondary: string;
  /** Fallback for color input (maps to theme primary) */
  initialTintHex: string;
};

export default function GroupIdentityPanel({
  groupId,
  initialLogoUrl,
  initialPrimary,
  initialSecondary,
  initialTintHex,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const t = useTranslations("AdminPage.identity");
  const inputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [pendingColors, setPendingColors] = useState<{
    primary: string;
    secondary: string;
    background_tint: string;
  } | null>(null);
  const [manual, setManual] = useState(() => ({
    primary: initialPrimary,
    secondary: initialSecondary,
    tint: initialTintHex,
  }));

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast(t("fileTooBig"), "error");
        return;
      }
      const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
      if (!allowed.includes(file.type)) {
        showToast(t("invalidType"), "error");
        return;
      }
      setUploading(true);
      try {
        const ext = extFromMime(file.type);
        const path = `${groupId}/logo.${ext}`;
        const { error: upErr } = await supabase.storage.from("group-logos").upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("group-logos").getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        const { error: dbErr } = await supabase.from("groups").update({ logo_url: publicUrl }).eq("id", groupId);
        if (dbErr) throw dbErr;
        setLogoUrl(publicUrl);

        try {
          const colors = await extractDominantColorsFromFile(file);
          const primary = colors[0] ?? "#10B981";
          const secondary = colors[1] ?? "#34D399";
          const background_tint = tintFromPrimaryHex(primary);
          setPendingColors({ primary, secondary, background_tint });
        } catch {
          setPendingColors(null);
        }

        showToast(t("uploaded"), "success");
        router.refresh();
      } catch {
        showToast(t("uploadError"), "error");
      } finally {
        setUploading(false);
      }
    },
    [groupId, router, showToast, supabase, t],
  );

  const applyExtracted = useCallback(async () => {
    if (!pendingColors) return;
    const { error } = await supabase
      .from("groups")
      .update({
        colors: pendingColors,
        primary_color: pendingColors.primary,
        secondary_color: pendingColors.secondary,
      })
      .eq("id", groupId);
    if (error) {
      showToast(t("saveError"), "error");
      return;
    }
    setManual({
      primary: pendingColors.primary,
      secondary: pendingColors.secondary,
      tint: pendingColors.primary,
    });
    setPendingColors(null);
    showToast(t("colorsSaved"), "success");
    router.refresh();
  }, [groupId, pendingColors, router, showToast, supabase, t]);

  const applyManual = useCallback(async () => {
    const background_tint = manual.tint.startsWith("#") ? tintFromPrimaryHex(manual.tint) : manual.tint;
    const { error } = await supabase
      .from("groups")
      .update({
        colors: {
          primary: manual.primary,
          secondary: manual.secondary,
          background_tint,
        },
        primary_color: manual.primary,
        secondary_color: manual.secondary,
      })
      .eq("id", groupId);
    if (error) {
      showToast(t("saveError"), "error");
      return;
    }
    showToast(t("colorsSaved"), "success");
    router.refresh();
  }, [groupId, manual, router, showToast, supabase, t]);

  const resetTheme = useCallback(async () => {
    const { error } = await supabase
      .from("groups")
      .update({ colors: null, primary_color: null, secondary_color: null })
      .eq("id", groupId);
    if (error) {
      showToast(t("saveError"), "error");
      return;
    }
    setManual({ primary: "#10B981", secondary: "#34D399", tint: "#10B981" });
    setPendingColors(null);
    showToast(t("resetDone"), "success");
    router.refresh();
  }, [groupId, router, showToast, supabase, t]);

  const removeLogo = useCallback(async () => {
    const { data: listed } = await supabase.storage.from("group-logos").list(groupId);
    if (listed?.length) {
      const paths = listed.map((f) => `${groupId}/${f.name}`);
      await supabase.storage.from("group-logos").remove(paths);
    }
    const { error } = await supabase.from("groups").update({ logo_url: null }).eq("id", groupId);
    if (error) {
      showToast(t("saveError"), "error");
      return;
    }
    setLogoUrl(null);
    showToast(t("removedLogo"), "success");
    router.refresh();
  }, [groupId, router, showToast, supabase, t]);

  return (
    <section className="mt-8 rounded-xl border border-dark-600 bg-dark-900/40 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-white">{t("sectionTitle")}</h2>
      <p className="mt-1 text-sm text-slate-400">{t("sectionHint")}</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="flex shrink-0 flex-col items-center gap-2"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            void onFile(f ?? null);
          }}
        >
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-dark-500 bg-dark-800">
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={96} height={96} className="h-full w-full object-cover" unoptimized />
            ) : (
              <span className="text-4xl text-slate-600" aria-hidden>
                ⚽
              </span>
            )}
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
                {t("uploading")}
              </div>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-gpri/40 hover:bg-dark-600 disabled:opacity-50"
          >
            {t("uploadLogo")}
          </button>
          <p className="max-w-[12rem] text-center text-xs text-slate-500">{t("dropHint")}</p>
          {logoUrl ? (
            <button
              type="button"
              onClick={() => void removeLogo()}
              className="text-sm font-medium text-red-400/90 hover:text-red-300"
            >
              {t("removeLogo")}
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {pendingColors ? (
            <div className="rounded-lg border border-gpri/30 bg-gpri/5 p-3">
              <p className="text-sm font-medium text-white">{t("extractedLabel")}</p>
              <div className="mt-2 flex gap-2">
                {(["primary", "secondary", "background_tint"] as const).map((k) => (
                  <div
                    key={k}
                    className="h-10 flex-1 rounded-md border border-white/10"
                    style={{ backgroundColor: pendingColors[k] }}
                    title={pendingColors[k]}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void applyExtracted()}
                className="mt-3 rounded-lg bg-gpri px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                {t("useTheseColors")}
              </button>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium text-slate-300">{t("manualLabel")}</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                {t("primary")}
                <input
                  type="color"
                  value={manual.primary.length === 7 ? manual.primary : "#10b981"}
                  onChange={(e) => setManual((m) => ({ ...m, primary: e.target.value }))}
                  className="h-10 w-20 cursor-pointer rounded border border-dark-500 bg-dark-800"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                {t("secondary")}
                <input
                  type="color"
                  value={manual.secondary.length === 7 ? manual.secondary : "#34d399"}
                  onChange={(e) => setManual((m) => ({ ...m, secondary: e.target.value }))}
                  className="h-10 w-20 cursor-pointer rounded border border-dark-500 bg-dark-800"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                {t("tint")}
                <input
                  type="color"
                  value={manual.tint.startsWith("#") && manual.tint.length === 7 ? manual.tint : "#10b981"}
                  onChange={(e) => setManual((m) => ({ ...m, tint: e.target.value }))}
                  className="h-10 w-20 cursor-pointer rounded border border-dark-500 bg-dark-800"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void applyManual()}
                className="rounded-lg border border-gpri/50 bg-gpri/20 px-3 py-2 text-sm font-semibold text-gsec hover:bg-gpri/30"
              >
                {t("applyManual")}
              </button>
              <button
                type="button"
                onClick={() => void resetTheme()}
                className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-dark-600"
              >
                {t("resetDefault")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
