/**
 * Client-only: sample downscaled image and return 3 distinct-ish hex colors.
 */
export function extractDominantColorsFromImageBitmap(
  source: CanvasImageSource,
  width = 48,
  height = 48,
): string[] {
  if (typeof document === "undefined") return ["#10B981", "#34D399", "#064E3B"];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return ["#10B981", "#34D399", "#064E3B"];

  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  const step = 4 * 3;
  for (let i = 0; i < data.length; i += step) {
    const a = data[i + 3] ?? 255;
    if (a < 32) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 24 && max - min < 8) continue;
    const qr = (r >> 3) << 3;
    const qg = (g >> 3) << 3;
    const qb = (b >> 3) << 3;
    const key = `${qr},${qg},${qb}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .map(({ r, g, b, n }) => ({
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    }));

  const out: string[] = [];
  const minDist = 42;
  function dist(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
  ) {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
  }
  for (const c of sorted) {
    if (out.length >= 3) break;
    const rgb = { r: c.r, g: c.g, b: c.b };
    if (out.every((h) => dist(hexToRgb(h), rgb) >= minDist)) {
      out.push(rgbToHex(c.r, c.g, c.b));
    }
  }

  while (out.length < 3) {
    const i = out.length;
    out.push(rgbToHex(16 + i * 40, 185 - i * 20, 129));
  }
  return out.slice(0, 3);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { r: 16, g: 185, b: 129 };
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export async function extractDominantColorsFromFile(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load"));
      img.src = url;
    });
    return extractDominantColorsFromImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}
