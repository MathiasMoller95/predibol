/** Space-separated RGB for Tailwind `rgb(var(--gpri-rgb) / <alpha>)`. */
export function hexToRgbSpaceSeparated(hex: string | null | undefined): string {
  if (!hex) return "16 185 129";
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "16 185 129";
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r} ${g} ${b}`;
}
