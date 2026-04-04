"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast-provider";
import {
  SHARE_COLORS,
  drawDiagonalWatermark,
  drawFootballWatermark,
  drawPredibolLogo,
  drawRadialBackground,
  getShareText,
  shareOrDownload,
} from "./canvas-utils";

const LOGICAL = 1080;
const SCALE = 2;

type Props = {
  groupName: string;
  locale: string;
};

export function drawInviteCard(ctx: CanvasRenderingContext2D, groupName: string, joinUs: string, tagline: string) {
  const w = LOGICAL;
  const h = LOGICAL;

  drawRadialBackground(ctx, w, h);
  drawDiagonalWatermark(ctx, w, h);
  drawFootballWatermark(ctx, w * 0.5, h * 0.62, 140);

  drawPredibolLogo(ctx, w / 2, h * 0.14, 44);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = SHARE_COLORS.white;
  ctx.font = `500 36px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  const ju = joinUs.length > 36 ? `${joinUs.slice(0, 35)}…` : joinUs;
  ctx.fillText(ju, w / 2, h * 0.28);

  ctx.fillStyle = SHARE_COLORS.emerald;
  ctx.font = `bold 52px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  const maxN = 22;
  const gn = groupName.length > maxN ? `${groupName.slice(0, maxN - 1)}…` : groupName;
  ctx.fillText(gn, w / 2, h * 0.38);

  ctx.fillStyle = SHARE_COLORS.muted;
  ctx.font = `600 28px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  ctx.fillText("WORLD CUP 2026", w / 2, h * 0.48);

  const footerY = h * 0.72;
  ctx.strokeStyle = SHARE_COLORS.emerald;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(w - 80, footerY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = SHARE_COLORS.emerald;
  ctx.font = `500 24px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  ctx.fillText("predibol.com", w / 2, footerY + 20);

  ctx.fillStyle = SHARE_COLORS.muted;
  ctx.font = `400 22px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  const tg = tagline.length > 42 ? `${tagline.slice(0, 41)}…` : tagline;
  ctx.fillText(tg, w / 2, footerY + 54);
}

export default function InviteCardShareButton({ groupName, locale }: Props) {
  const t = useTranslations("Share");
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (busy) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      canvas.width = LOGICAL * SCALE;
      canvas.height = LOGICAL * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no context");
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      const joinUs = t("invite.joinUs");
      const tagline = getShareText(locale);
      drawInviteCard(ctx, groupName, joinUs, tagline);
      const outcome = await shareOrDownload(canvas, "predibol-invite.png");
      if (outcome !== "cancelled") {
        showToast(t("invite.toast"), "success");
      }
    } catch {
      showToast(t("invite.error"), "error");
    } finally {
      setBusy(false);
    }
  }, [busy, groupName, locale, showToast, t]);

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
        onClick={() => void run()}
        className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-500/60 bg-dark-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-dark-600 disabled:opacity-50 sm:w-auto`}
      >
        {t("invite.button")}
      </button>
    </>
  );
}
