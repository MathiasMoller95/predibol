/** Inline SVG presets for “pick an icon” group logos (emoji center, rounded square). */

export type GroupLogoIconPreset = { id: string; svg: string };

function svgEmoji(bg: string, emoji: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <text x="256" y="335" text-anchor="middle" font-size="200" font-family="system-ui,Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
</svg>`;
}

export const GROUP_LOGO_ICON_PRESETS: GroupLogoIconPreset[] = [
  { id: "ball", svg: svgEmoji("#0f172a", "⚽") },
  { id: "trophy", svg: svgEmoji("#14532d", "🏆") },
  { id: "stadium", svg: svgEmoji("#1e3a5f", "🏟️") },
  { id: "fire", svg: svgEmoji("#431407", "🔥") },
  { id: "star", svg: svgEmoji("#422006", "⭐") },
  { id: "globe", svg: svgEmoji("#134e4a", "🌍") },
  { id: "shield", svg: svgEmoji("#312e81", "🛡️") },
  { id: "lightning", svg: svgEmoji("#365314", "⚡") },
  { id: "chart", svg: svgEmoji("#164e63", "📊") },
  { id: "target", svg: svgEmoji("#831843", "🎯") },
  { id: "handshake", svg: svgEmoji("#713f12", "🤝") },
  { id: "flag", svg: svgEmoji("#881337", "🏁") },
];
