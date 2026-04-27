"use client";

import { useEffect } from "react";

export default function PointsPreview({
  visible,
  pointsDisplay,
  messageTemplate,
  onDismiss,
}: {
  visible: boolean;
  pointsDisplay: number;
  /** Must include {points} placeholder */
  messageTemplate: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => onDismiss(), 3000);
    return () => window.clearTimeout(t);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const text = messageTemplate.replace(/\{points\}/g, String(pointsDisplay));

  return (
    <p
      className="pred-points-preview-in pointer-events-none mt-2 origin-top text-sm text-amber-400/80"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
