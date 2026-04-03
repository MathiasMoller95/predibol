/** Format a UTC match time for display in the user's timezone and UI locale. */
export function formatMatchTime(matchTimeUTC: string, timezone: string, locale: string): string {
  const date = new Date(matchTimeUTC);
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

/** Browser timezone when available (client-only); safe fallback for SSR. */
export function getBrowserTimeZone(): string {
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch {
      /* ignore */
    }
  }
  return "Europe/Madrid";
}

export const DEFAULT_TIMEZONE = "Europe/Madrid";
