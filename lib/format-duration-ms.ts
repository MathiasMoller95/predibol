/** Formats elapsed time as "2h 15m"; supports multi-hour spans. */
export function formatDurationMs(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${min.toString().padStart(2, "0")}m`;
}
