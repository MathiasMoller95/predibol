"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Globe, ImageIcon, Link2, Palette, X } from "lucide-react";
import { GROUP_LOGO_ICON_PRESETS } from "@/lib/group-logo-icons";
import { extFromMime, validateLogoFile } from "@/lib/group-logo-upload";

export type LogoUploadLabels = {
  upload: string;
  hint: string;
  formats?: string;
  remove: string;
  title?: string;
  /** Primary action — opens source picker (recommended). Falls back to `upload`. */
  chooseLogo?: string;
  sheetTitle?: string;
  fromGallery?: string;
  takePhoto?: string;
  pickIcon?: string;
  fromUrl?: string;
  searchWeb?: string;
  /** Helper text under “Search the web” */
  searchWebHint?: string;
  urlModalTitle?: string;
  urlPlaceholder?: string;
  urlLoad?: string;
  cancel?: string;
  iconsModalTitle?: string;
};

export type LogoValidationReason = "size" | "type" | "url" | "fetch";

type Props = {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
  onClear: () => void;
  onValidationError: (reason: LogoValidationReason) => void;
  labels: LogoUploadLabels;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  /** Preview size (width & height), default 80 */
  sizePx?: number;
  /** Use rounded-full for circle; rounded-2xl for admin-style tile */
  previewShape?: "circle" | "rounded";
  className?: string;
};

export default function LogoUploadField({
  previewUrl,
  onFileSelected,
  onClear,
  onValidationError,
  labels,
  disabled = false,
  busy = false,
  busyLabel,
  sizePx = 80,
  previewShape = "circle",
  className = "",
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const roundedClass = previewShape === "circle" ? "rounded-full" : "rounded-2xl";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  const sheetTitle = labels.sheetTitle ?? labels.upload;
  const fromGallery = labels.fromGallery ?? "Photo library or files";
  const takePhoto = labels.takePhoto ?? "Take photo";
  const pickIcon = labels.pickIcon ?? "Choose an icon";
  const fromUrl = labels.fromUrl ?? "Paste image link";
  const searchWeb = labels.searchWeb ?? "Search on the web";
  const searchWebHint = labels.searchWebHint ?? "Opens Google Images — copy an image address and use Paste link.";
  const urlModalTitle = labels.urlModalTitle ?? "Image from link";
  const urlPlaceholder = labels.urlPlaceholder ?? "https://…";
  const urlLoad = labels.urlLoad ?? "Load";
  const cancel = labels.cancel ?? "Cancel";
  const iconsModalTitle = labels.iconsModalTitle ?? "Choose an icon";
  const chooseLogo = labels.chooseLogo ?? labels.upload;

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      const v = validateLogoFile(file);
      if (!v.ok) {
        onValidationError(v.reason);
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected, onValidationError]
  );

  const loadUrlImage = useCallback(async () => {
    const raw = urlInput.trim();
    if (!raw) {
      onValidationError("url");
      return;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(raw);
    } catch {
      onValidationError("url");
      return;
    }
    if (!parsedUrl.hostname || (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")) {
      onValidationError("url");
      return;
    }

    setUrlLoading(true);
    try {
      const res = await fetch("/api/fetch-logo-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      if (!res.ok) {
        onValidationError("fetch");
        return;
      }
      const data = (await res.json()) as { contentType?: string; base64?: string };
      const ct = data.contentType;
      const b64 = data.base64;
      if (!ct || !b64 || typeof ct !== "string" || typeof b64 !== "string") {
        onValidationError("fetch");
        return;
      }
      let binary: Uint8Array;
      try {
        binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        onValidationError("fetch");
        return;
      }
      const ext = extFromMime(ct);
      const ab = new ArrayBuffer(binary.length);
      new Uint8Array(ab).set(binary);
      const blob = new Blob([ab], { type: ct });
      const file = new File([blob], `logo.${ext}`, { type: ct });
      const v = validateLogoFile(file);
      if (!v.ok) {
        onValidationError(v.reason);
        return;
      }
      onFileSelected(file);
      setUrlOpen(false);
      setSheetOpen(false);
      setUrlInput("");
    } catch {
      onValidationError("fetch");
    } finally {
      setUrlLoading(false);
    }
  }, [onFileSelected, onValidationError, urlInput]);

  const pickPresetIcon = useCallback(
    (svg: string, id: string) => {
      const file = new File([svg], `logo-${id}.svg`, { type: "image/svg+xml" });
      const v = validateLogoFile(file);
      if (!v.ok) {
        onValidationError(v.reason);
        return;
      }
      onFileSelected(file);
      setIconsOpen(false);
      setSheetOpen(false);
    },
    [onFileSelected, onValidationError]
  );

  const openGoogleImages = useCallback(() => {
    const q = encodeURIComponent("world cup football logo png");
    window.open(`https://www.google.com/search?tbm=isch&q=${q}`, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    if (!sheetOpen && !iconsOpen && !urlOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSheetOpen(false);
        setIconsOpen(false);
        setUrlOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, iconsOpen, urlOpen]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {labels.title ? (
        <p className="text-sm font-medium text-slate-300">{labels.title}</p>
      ) : null}
      <div
        className={`flex flex-col items-center gap-3 rounded-xl border border-dashed border-dark-500 bg-dark-800/80 px-4 py-4 ${
          disabled || busy ? "opacity-60" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled || busy) return;
          const f = e.dataTransfer.files[0];
          handleFile(f ?? null);
        }}
      >
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-dark-500 bg-dark-800 ${roundedClass}`}
          style={{ width: sizePx, height: sizePx }}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt=""
              width={sizePx}
              height={sizePx}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-3xl text-slate-600" aria-hidden>
              ⚽
            </span>
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
              {busyLabel ?? "…"}
            </div>
          ) : null}
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
            setSheetOpen(false);
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
            setSheetOpen(false);
          }}
        />

        <div className="flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={() => !disabled && !busy && setSheetOpen(true)}
            disabled={disabled || busy}
            className="text-sm font-semibold text-gpri hover:underline disabled:opacity-50"
          >
            {chooseLogo}
          </button>
          <p className="max-w-[16rem] text-xs text-slate-500">{labels.hint}</p>
          {labels.formats ? <p className="text-xs text-slate-500">{labels.formats}</p> : null}
        </div>
        {previewUrl ? (
          <button
            type="button"
            onClick={() => onClear()}
            disabled={disabled || busy}
            className="text-sm font-medium text-red-400/90 hover:text-red-300 disabled:opacity-50"
          >
            {labels.remove}
          </button>
        ) : null}
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="logo-sheet-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={cancel}
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative z-[201] w-full max-w-md rounded-t-2xl border border-white/10 bg-dark-800 p-4 shadow-2xl sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p id="logo-sheet-title" className="text-sm font-semibold text-white">
                {sheetTitle}
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label={cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  galleryRef.current?.click();
                }}
                className="flex items-center gap-3 rounded-xl border border-dark-500 bg-dark-700/80 px-4 py-3 text-left text-sm font-medium text-white transition hover:border-gpri/50"
              >
                <ImageIcon className="h-5 w-5 shrink-0 text-gpri" aria-hidden />
                {fromGallery}
              </button>
              <button
                type="button"
                onClick={() => {
                  cameraRef.current?.click();
                }}
                className="flex items-center gap-3 rounded-xl border border-dark-500 bg-dark-700/80 px-4 py-3 text-left text-sm font-medium text-white transition hover:border-gpri/50"
              >
                <Camera className="h-5 w-5 shrink-0 text-gpri" aria-hidden />
                {takePhoto}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setIconsOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-dark-500 bg-dark-700/80 px-4 py-3 text-left text-sm font-medium text-white transition hover:border-gpri/50"
              >
                <Palette className="h-5 w-5 shrink-0 text-gpri" aria-hidden />
                {pickIcon}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setUrlOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-dark-500 bg-dark-700/80 px-4 py-3 text-left text-sm font-medium text-white transition hover:border-gpri/50"
              >
                <Link2 className="h-5 w-5 shrink-0 text-gpri" aria-hidden />
                {fromUrl}
              </button>
              <div className="rounded-xl border border-dark-600 bg-dark-900/50 p-3">
                <button
                  type="button"
                  onClick={openGoogleImages}
                  className="flex w-full items-center gap-3 text-left text-sm font-medium text-white"
                >
                  <Globe className="h-5 w-5 shrink-0 text-sky-400" aria-hidden />
                  {searchWeb}
                </button>
                <p className="mt-2 pl-8 text-xs text-slate-500">{searchWebHint}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {iconsOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="logo-icons-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={cancel}
            onClick={() => setIconsOpen(false)}
          />
          <div className="relative z-[201] max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-dark-800 p-4 shadow-2xl sm:max-h-[80vh] sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p id="logo-icons-title" className="text-sm font-semibold text-white">
                {iconsModalTitle}
              </p>
              <button
                type="button"
                onClick={() => setIconsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label={cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {GROUP_LOGO_ICON_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => pickPresetIcon(preset.svg, preset.id)}
                  disabled={disabled || busy}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dark-500 bg-dark-700/50 p-2 transition hover:border-gpri/60 hover:bg-dark-700 disabled:opacity-50"
                  title={preset.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- small inline SVG data URIs from trusted presets */}
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svg)}`}
                    alt=""
                    className="h-full max-h-[72px] w-full max-w-[72px] object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {urlOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="logo-url-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={cancel}
            onClick={() => {
              setUrlOpen(false);
              setUrlInput("");
            }}
          />
          <div className="relative z-[201] w-full max-w-md rounded-2xl border border-white/10 bg-dark-800 p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p id="logo-url-title" className="text-sm font-semibold text-white">
                {urlModalTitle}
              </p>
              <button
                type="button"
                onClick={() => {
                  setUrlOpen(false);
                  setUrlInput("");
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label={cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={urlPlaceholder}
              disabled={urlLoading || disabled || busy}
              className="mb-3 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gpri"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadUrlImage();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUrlOpen(false);
                  setUrlInput("");
                }}
                className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white"
              >
                {cancel}
              </button>
              <button
                type="button"
                onClick={() => void loadUrlImage()}
                disabled={urlLoading || disabled || busy}
                className="rounded-lg bg-gpri px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {urlLoading ? "…" : urlLoad}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
