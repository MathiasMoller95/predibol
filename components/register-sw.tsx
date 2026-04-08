"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production so the app is installable (PWA).
 * No offline caching; service worker only satisfies installability checks.
 */
export default function RegisterSw() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal */
    });
  }, []);

  return null;
}
