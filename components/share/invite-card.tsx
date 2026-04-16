"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import {
  SHARE_COLORS,
  getShareText,
} from "./canvas-utils";

const LOGICAL = 1080;
const SCALE = 2;

type Props = {
  groupName: string;
  locale: string;
  inviteUrl: string;
  logoUrl?: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accessMode: "open" | "protected";
  accessCode: string | null;
  onCopied?: () => void;
  onCopyFailed?: () => void;
};

const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function parseHexRgb(hex: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string | null | undefined, alpha: number, fallback: string) {
  const p = parseHexRgb(hex);
  if (!p) return fallback;
  return `rgba(${p.r},${p.g},${p.b},${clamp(alpha, 0, 1)})`;
}

function fitTextSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  while (size > min) {
    ctx.font = `800 ${size}px ${SYSTEM_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawNetWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, fg: string, bg: string) {
  ctx.save();
  ctx.font = `700 22px ${SYSTEM_STACK}`;
  const padX = 18;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2;
  const h = 44;
  roundRectPath(ctx, x, y, w, h, 22);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function drawInviteCardV2(args: {
  ctx: CanvasRenderingContext2D;
  groupName: string;
  locale: string;
  logoImg: CanvasImageSource | null;
  primary: string;
  secondary: string;
  joinPoolTagline: string;
  pillSuperpowers: string;
  pillStickerAlbum: string;
  pillAiRival: string;
}) {
  const { ctx } = args;
  const w = LOGICAL;
  const h = LOGICAL;

  // Background with subtle group tint.
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0A0E14";
  ctx.fillRect(0, 0, w, h);
  const grd = ctx.createRadialGradient(w / 2, h * 0.25, 0, w / 2, h * 0.25, w * 0.9);
  grd.addColorStop(0, rgba(args.primary, 0.16, "rgba(16,185,129,0.16)"));
  grd.addColorStop(0.6, rgba(args.secondary, 0.12, "rgba(52,211,153,0.12)"));
  grd.addColorStop(1, "rgba(10,14,20,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  drawNetWatermark(ctx, w, h);

  // Top-right understated wordmark.
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `900 40px ${SYSTEM_STACK}`;
  ctx.fillText("PREDIBOL", w - 64, 48);
  ctx.restore();

  const centerX = w / 2;

  // Hero logo.
  const logoSize = 400;
  const logoY = 130;
  if (args.logoImg) {
    ctx.save();
    // Glow ring
    ctx.shadowColor = rgba(args.primary, 0.55, "rgba(16,185,129,0.55)");
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;
    roundRectPath(ctx, centerX - logoSize / 2, logoY, logoSize, logoSize, 72);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, centerX - logoSize / 2, logoY, logoSize, logoSize, 72);
    ctx.clip();
    ctx.drawImage(args.logoImg, centerX - logoSize / 2, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, centerX - logoSize / 2, logoY, logoSize, logoSize, 72);
    ctx.strokeStyle = rgba(args.primary, 0.55, "rgba(16,185,129,0.55)");
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();
  } else {
    // No-logo fallback: soccer ball + big group name as hero
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `900 140px ${SYSTEM_STACK}`;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillText("⚽", centerX, logoY + 40);
    ctx.restore();
  }

  // Group name (never overlaps logo due to fixed spacing).
  const nameY = logoY + logoSize + 44;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = SHARE_COLORS.white;
  const maxNameW = w - 160;
  const nameSize = fitTextSize(ctx, args.groupName, maxNameW, 72, 46);
  ctx.font = `900 ${nameSize}px ${SYSTEM_STACK}`;
  ctx.fillText(args.groupName, centerX, nameY);
  ctx.restore();

  // Join pool tagline
  const taglineY = nameY + nameSize + 18;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = args.primary;
  ctx.font = `800 32px ${SYSTEM_STACK}`;
  ctx.fillText(args.joinPoolTagline, centerX, taglineY);
  ctx.restore();

  // Divider line (WC gradient)
  const dividerY = taglineY + 64;
  const wcGrad = ctx.createLinearGradient(0, dividerY, w, dividerY);
  wcGrad.addColorStop(0, "#06B6D4");
  wcGrad.addColorStop(0.5, "#EC4899");
  wcGrad.addColorStop(1, "#F97316");
  ctx.save();
  ctx.strokeStyle = wcGrad;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(120, dividerY);
  ctx.lineTo(w - 120, dividerY);
  ctx.stroke();
  ctx.restore();

  // FIFA WORLD CUP 2026 gradient text
  const fifaY = dividerY + 26;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `900 28px ${SYSTEM_STACK}`;
  ctx.fillStyle = wcGrad;
  ctx.fillText("FIFA WORLD CUP 2026", centerX, fifaY);
  ctx.restore();

  // Flags row
  const flagsY = fifaY + 44;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `700 48px ${SYSTEM_STACK}`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("🇺🇸 🇨🇦 🇲🇽 ⚽", centerX, flagsY);
  ctx.restore();

  // Feature pills
  const pillsY = flagsY + 84;
  const pillFg = "rgba(255,255,255,0.92)";
  const pillBg = rgba(args.secondary, 0.18, "rgba(255,255,255,0.08)");
  ctx.save();
  const pillTexts = [
    `⚡ ${args.pillSuperpowers}`,
    `🎴 ${args.pillStickerAlbum}`,
    `🤖 ${args.pillAiRival}`,
  ];
  ctx.font = `700 22px ${SYSTEM_STACK}`;
  const widths = pillTexts.map((txt) => ctx.measureText(txt).width + 36);
  const totalW = widths.reduce((a, b) => a + b, 0) + 18 * 2;
  let startX = centerX - totalW / 2;
  for (let i = 0; i < pillTexts.length; i++) {
    const wP = drawPill(ctx, startX, pillsY, pillTexts[i]!, pillFg, pillBg);
    startX += wP + 18;
  }
  ctx.restore();

  // Bottom
  const bottomY = h - 140;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = args.primary;
  ctx.font = `800 28px ${SYSTEM_STACK}`;
  ctx.fillText("predibol.com", centerX, bottomY);
  ctx.fillStyle = "rgba(156,163,175,0.9)";
  ctx.font = `600 24px ${SYSTEM_STACK}`;
  ctx.fillText(getShareText(args.locale), centerX, bottomY + 44);
  ctx.restore();
}

async function loadLogo(url: string): Promise<HTMLImageElement> {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = url;
  });
}

async function canvasToPngFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 1));
  if (!blob) throw new Error("Canvas toBlob failed");
  return new File([blob], filename, { type: "image/png" });
}

function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  // Prefer capability check (native share sheet).
  if ("share" in navigator && typeof (navigator as unknown as { share?: unknown }).share === "function") return true;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function InviteShareButton({
  groupName,
  locale,
  inviteUrl,
  logoUrl,
  primaryColor,
  secondaryColor,
  accessMode,
  accessCode,
  onCopied,
  onCopyFailed,
}: Props) {
  const t = useTranslations("Share");
  const tAccess = useTranslations("AccessCode");
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [cachedLogo, setCachedLogo] = useState<HTMLImageElement | null>(null);

  const primary = primaryColor ?? SHARE_COLORS.emerald;
  const secondary = secondaryColor ?? "#34D399";

  const isMobile = useMemo(() => detectMobile(), []);

  const inviteText = useMemo(() => {
    const base =
      accessMode === "protected" && accessCode
        ? tAccess("whatsappProtected", { groupName, link: inviteUrl, code: accessCode })
        : tAccess("whatsappOpen", { groupName, link: inviteUrl });
    // WhatsApp strings already include link + code when needed; reuse them as share caption.
    return base;
  }, [accessCode, accessMode, groupName, inviteUrl, tAccess]);

  const generateCardFile = useCallback(async (): Promise<File> => {
    if (busy) throw new Error("busy");
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("no canvas");
    setBusy(true);
    try {
      canvas.width = LOGICAL * SCALE;
      canvas.height = LOGICAL * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no context");
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      let resolvedLogo = cachedLogo;
      if (!resolvedLogo && logoUrl) {
        try {
          resolvedLogo = await loadLogo(logoUrl);
          setCachedLogo(resolvedLogo);
        } catch {
          resolvedLogo = null;
        }
      }
      drawInviteCardV2({
        ctx,
        groupName,
        locale,
        logoImg: resolvedLogo,
        primary,
        secondary,
        joinPoolTagline: t("invite.cardTaglinePool"),
        pillSuperpowers: t("invite.pillSuperpowers"),
        pillStickerAlbum: t("invite.pillStickerAlbum"),
        pillAiRival: t("invite.pillAiRival"),
      });
      return await canvasToPngFile(canvas, "predibol-invite.png");
    } finally {
      setBusy(false);
    }
  }, [busy, cachedLogo, groupName, locale, logoUrl, primary, secondary, t]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      onCopied?.();
      showToast(t("invite.linkCopied"), "success");
    } catch {
      onCopyFailed?.();
      showToast(t("invite.error"), "error");
    }
  }, [inviteUrl, onCopied, onCopyFailed, showToast, t]);

  const runPrimary = useCallback(async () => {
    if (!isMobile) {
      await copyLink();
      return;
    }

    try {
      const file = await generateCardFile();
      if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? true)) {
        await navigator.share({
          files: [file],
          text: inviteText,
          url: inviteUrl,
        });
        showToast(t("invite.toast"), "success");
        return;
      }
      throw new Error("share not available");
    } catch (e: unknown) {
      // If the user cancels share, don't show fallback.
      if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") {
        return;
      }
      setFallbackMode(true);
    }
  }, [copyLink, generateCardFile, inviteText, inviteUrl, isMobile, showToast, t]);

  const downloadCard = useCallback(async () => {
    const file = await generateCardFile();
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [generateCardFile]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={LOGICAL * SCALE}
        height={LOGICAL * SCALE}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10 h-px w-px opacity-0"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void runPrimary()}
        className="inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gpri px-4 py-3 text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isMobile ? <Smartphone className="h-4 w-4" aria-hidden /> : <Monitor className="h-4 w-4" aria-hidden />}
        <span>
          {isMobile ? t("invite.shareWithFriendsMobile") : t("invite.copyInviteLinkDesktop")}
        </span>
      </button>

      {fallbackMode ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
          >
            {t("invite.copyInviteLinkDesktop")}
          </button>
          <button
            type="button"
            onClick={() => void downloadCard()}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-60 ${PRIMARY_BUTTON_CLASSES}`}
          >
            {t("invite.downloadInviteCard")}
          </button>
        </div>
      ) : null}
    </>
  );
}
