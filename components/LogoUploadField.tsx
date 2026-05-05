"use client";

import Image from "next/image";
import { useRef } from "react";
import { validateLogoFile } from "@/lib/group-logo-upload";

export type LogoUploadLabels = {
  upload: string;
  hint: string;
  formats?: string;
  remove: string;
  title?: string;
};

type Props = {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
  onClear: () => void;
  onValidationError: (reason: "size" | "type") => void;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const roundedClass = previewShape === "circle" ? "rounded-full" : "rounded-2xl";

  function handleFile(file: File | null) {
    if (!file) return;
    const v = validateLogoFile(file);
    if (!v.ok) {
      onValidationError(v.reason);
      return;
    }
    onFileSelected(file);
  }

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
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="text-sm font-semibold text-gpri hover:underline disabled:opacity-50"
          >
            {labels.upload}
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
    </div>
  );
}
