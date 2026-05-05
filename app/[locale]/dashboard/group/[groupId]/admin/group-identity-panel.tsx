"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoUploadField from "@/components/LogoUploadField";
import { uploadGroupLogo } from "@/lib/group-logo-upload";
import { extractDominantColorsFromFile } from "@/lib/extract-dominant-colors";
import { useToast } from "@/components/ui/toast-provider";

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
    async (file: File) => {
      setUploading(true);
      try {
        const { error, publicUrl } = await uploadGroupLogo(supabase, groupId, file, file.type);
        if (error) throw error;
        if (publicUrl) setLogoUrl(publicUrl);

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
        <LogoUploadField
          previewUrl={logoUrl}
          onFileSelected={(f) => void onFile(f)}
          onClear={() => void removeLogo()}
          onValidationError={(reason) =>
            showToast(reason === "size" ? t("fileTooBig") : t("invalidType"), "error")
          }
          labels={{
            upload: t("uploadLogo"),
            hint: t("dropHint"),
            remove: t("removeLogo"),
          }}
          busy={uploading}
          busyLabel={t("uploading")}
          sizePx={96}
          previewShape="rounded"
          className="shrink-0 sm:w-auto"
        />

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
