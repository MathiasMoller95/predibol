/**
 * One-off: generates public/icon-192.png and public/icon-512.png from SVG (Predibol-style mark).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#0A0E14"/>
  <text x="256" y="330" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="220" font-weight="800">
    <tspan fill="#10B981">P</tspan><tspan fill="#FFFFFF">b</tspan>
  </text>
</svg>`;

const buf = Buffer.from(svg);

for (const size of [192, 512]) {
  const out = join(publicDir, `icon-${size}.png`);
  await sharp(buf).resize(size, size).png().toFile(out);
  console.log("Wrote", out);
}
