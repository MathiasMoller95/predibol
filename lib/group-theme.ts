import type { Json } from "@/types/supabase";

export type GroupColorsJson = {
  primary?: string;
  secondary?: string;
  background_tint?: string;
};

const DEFAULT_PRIMARY = "#10B981";
const DEFAULT_SECONDARY = "#34D399";
function parseHexRgb(hex: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function resolveBackgroundTint(raw: string | undefined, primaryHex: string): string {
  if (!raw) {
    const p = parseHexRgb(primaryHex) ?? { r: 16, g: 185, b: 129 };
    return `rgba(${p.r},${p.g},${p.b},0.08)`; // Predibol default tint
  }
  const t = raw.trim();
  if (t.startsWith("rgba(") || t.startsWith("rgb(")) return t;
  const p = parseHexRgb(t);
  if (p) return `rgba(${p.r},${p.g},${p.b},0.08)`;
  return raw;
}

export function parseGroupColors(colors: Json | null | undefined): GroupColorsJson | null {
  if (!colors || typeof colors !== "object" || Array.isArray(colors)) return null;
  const o = colors as Record<string, unknown>;
  const primary = typeof o.primary === "string" ? o.primary : undefined;
  const secondary = typeof o.secondary === "string" ? o.secondary : undefined;
  const background_tint = typeof o.background_tint === "string" ? o.background_tint : undefined;
  if (!primary && !secondary && !background_tint) return null;
  return { primary, secondary, background_tint };
}

export function resolveGroupTheme(args: {
  colors: Json | null | undefined;
  primary_color: string | null;
  secondary_color: string | null;
}): {
  primary: string;
  secondary: string;
  backgroundTint: string;
} {
  const parsed = parseGroupColors(args.colors);
  const primary = parsed?.primary ?? args.primary_color ?? DEFAULT_PRIMARY;
  const secondary = parsed?.secondary ?? args.secondary_color ?? DEFAULT_SECONDARY;
  const backgroundTint = resolveBackgroundTint(parsed?.background_tint, primary);
  return { primary, secondary, backgroundTint };
}
