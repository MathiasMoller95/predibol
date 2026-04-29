"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0e14] p-8 text-center text-slate-200 antialiased">
        <p className="text-lg font-semibold text-white">Something went wrong</p>
        <p className="max-w-md text-sm text-slate-400">
          We have been notified. Try refreshing the page or come back shortly.
        </p>
      </body>
    </html>
  );
}
