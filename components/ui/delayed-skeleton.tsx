"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  delayMs?: number;
};

/** Avoids a flash of skeleton on very fast navigations. */
export default function DelayedSkeleton({ children, delayMs = 150 }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  if (!show) {
    return <div className="min-h-[40vh]" aria-hidden />;
  }

  return <>{children}</>;
}
