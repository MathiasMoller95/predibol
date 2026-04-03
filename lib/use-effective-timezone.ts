"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TIMEZONE, getBrowserTimeZone } from "@/lib/format-match-time";

/** Profile timezone from DB, else browser (after mount), else Madrid. */
export function useEffectiveTimeZone(profileTimeZone: string | null): string {
  const [browserTz, setBrowserTz] = useState<string | null>(null);
  useEffect(() => {
    setBrowserTz(getBrowserTimeZone());
  }, []);
  const trimmed = profileTimeZone?.trim();
  return (trimmed && trimmed.length > 0 ? trimmed : null) ?? browserTz ?? DEFAULT_TIMEZONE;
}
