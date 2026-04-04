/** Shared Canvas 2D helpers for Predibol share images (no external deps). */

export const SHARE_COLORS = {
  bg: "#0A0E14",
  bgCenter: "#0f1520",
  card: "#1a2332",
  white: "#ffffff",
  muted: "#9CA3AF",
  emerald: "#10B981",
  gold: "#F59E0B",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
} as const;

const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

export function drawRadialBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h * 0.35;
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
  grd.addColorStop(0, SHARE_COLORS.bgCenter);
  grd.addColorStop(1, SHARE_COLORS.bg);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Centered wordmark: x = horizontal center, y = vertical center (middle).
 */
export function drawPredibolLogo(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number) {
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `bold ${fontSize}px ${SYSTEM_STACK}`;
  const predi = "PREDI";
  const bol = "BOL";
  const w1 = ctx.measureText(predi).width;
  const w2 = ctx.measureText(bol).width;
  let left = x - (w1 + w2) / 2;
  ctx.fillStyle = SHARE_COLORS.white;
  ctx.fillText(predi, left, y);
  left += w1;
  ctx.fillStyle = SHARE_COLORS.emerald;
  ctx.fillText(bol, left, y);
}

/** Locale-appropriate marketing tagline (invite card footer). */
export function getShareText(locale: string): string {
  switch (locale) {
    case "es":
      return "Predice. Compite. Gana.";
    case "pt":
      return "Preveja. Compita. Vença.";
    default:
      return "Predict. Compete. Win.";
  }
}

export type ShareOutcome = "shared" | "downloaded" | "cancelled";

export async function shareOrDownload(canvas: HTMLCanvasElement, filename: string): Promise<ShareOutcome> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 1);
  });
  if (!blob) {
    throw new Error("Canvas toBlob failed");
  }
  const file = new File([blob], filename, { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.share) {
    const can = navigator.canShare?.({ files: [file] }) ?? false;
    if (can) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch (e: unknown) {
        if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") {
          return "cancelled";
        }
        /* fall through to download */
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}

/** Faint diagonal lines. */
export function drawDiagonalWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const step = 48;
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();
}

/** Simple football outline — avoids emoji paint issues. */
export function drawFootballWatermark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = SHARE_COLORS.white;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
