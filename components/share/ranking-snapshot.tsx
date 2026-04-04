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
  drawRoundedRect,
  shareOrDownload,
} from "./canvas-utils";

const LOGICAL_W = 1080;
const LOGICAL_H = 1350;
const SCALE = 2;

export type RankingSnapshotRow = {
  rank: number;
  name: string;
  points: number;
};

type Props = {
  groupName: string;
  rankings: RankingSnapshotRow[];
  locale: string;
};

function rankColor(rank: number): string {
  if (rank === 1) return SHARE_COLORS.gold;
  if (rank === 2) return SHARE_COLORS.silver;
  if (rank === 3) return SHARE_COLORS.bronze;
  return SHARE_COLORS.white;
}

export function drawRankingSnapshot(
  ctx: CanvasRenderingContext2D,
  groupName: string,
  rankings: RankingSnapshotRow[],
  footerTagline: string,
) {
  const w = LOGICAL_W;
  const h = LOGICAL_H;

  drawRadialBackground(ctx, w, h);
  drawDiagonalWatermark(ctx, w, h);
  drawFootballWatermark(ctx, w * 0.88, h * 0.9, 48);

  const headerY = h * 0.1;
  drawPredibolLogo(ctx, w / 2, headerY, 48);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = SHARE_COLORS.white;
  ctx.font = `500 26px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  const maxG = 40;
  const gn = groupName.length > maxG ? `${groupName.slice(0, maxG - 1)}…` : groupName;
  ctx.fillText(gn, w / 2, headerY + 52);

  ctx.fillStyle = SHARE_COLORS.muted;
  ctx.font = `400 20px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  ctx.fillText("WORLD CUP 2026", w / 2, headerY + 92);

  // Text-only section title (emoji unreliable on canvas)
  ctx.fillStyle = SHARE_COLORS.white;
  ctx.font = `bold 34px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  ctx.fillText("RANKING", w / 2, h * 0.22);

  const listTop = h * 0.27;
  const rowH = 108;
  const rowGap = 18;
  const rowW = w - 100;
  const rowX = 50;
  const mono = 'ui-monospace, SFMono-Regular, Menlo, "Courier New", monospace';

  rankings.forEach((row, i) => {
    const y = listTop + i * (rowH + rowGap);
    drawRoundedRect(ctx, rowX, y, rowW, rowH, 14, SHARE_COLORS.card);

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `bold 32px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
    ctx.fillStyle = rankColor(row.rank);
    ctx.fillText(`#${row.rank}`, rowX + 24, y + rowH / 2);

    ctx.fillStyle = SHARE_COLORS.white;
    ctx.font = `500 28px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
    const label = row.name.length > 26 ? `${row.name.slice(0, 25)}…` : row.name;
    ctx.fillText(label, rowX + 108, y + rowH / 2);

    ctx.textAlign = "right";
    ctx.fillStyle = SHARE_COLORS.emerald;
    ctx.font = `bold 30px ${mono}`;
    ctx.fillText(String(row.points), rowX + rowW - 24, y + rowH / 2);
  });

  const footerTop = h * 0.81;
  ctx.save();
  ctx.strokeStyle = SHARE_COLORS.emerald;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, footerTop);
  ctx.lineTo(w - 72, footerTop);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = SHARE_COLORS.emerald;
  ctx.font = `500 22px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  ctx.fillText("predibol.com", w / 2, footerTop + 18);

  ctx.fillStyle = SHARE_COLORS.muted;
  ctx.font = `400 20px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}`;
  const ft = footerTagline.length > 48 ? `${footerTagline.slice(0, 47)}…` : footerTagline;
  ctx.fillText(ft, w / 2, footerTop + 50);
}

export default function RankingSnapshotShareButton({ groupName, rankings }: Props) {
  const t = useTranslations("Share");
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (rankings.length === 0 || busy) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      canvas.width = LOGICAL_W * SCALE;
      canvas.height = LOGICAL_H * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no context");
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      const footerTagline = t("ranking.footer");
      drawRankingSnapshot(ctx, groupName, rankings, footerTagline);
      const outcome = await shareOrDownload(canvas, "predibol-ranking.png");
      if (outcome !== "cancelled") {
        showToast(t("ranking.toast"), "success");
      }
    } catch {
      showToast(t("ranking.error"), "error");
    } finally {
      setBusy(false);
    }
  }, [busy, groupName, rankings, showToast, t]);

  if (rankings.length === 0) {
    return null;
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={LOGICAL_W * SCALE}
        height={LOGICAL_H * SCALE}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10 h-px w-px opacity-0"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="inline-flex min-h-[40px] shrink-0 items-center rounded-lg border border-slate-500/60 bg-transparent px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-dark-700/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("ranking.button")}
      </button>
    </>
  );
}
