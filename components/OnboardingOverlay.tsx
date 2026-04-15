"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";

type Props = {
  locale: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  exactPoints: number;
  isAdmin: boolean;
  onboardingCompletedAt: string | null;
  currentUserId: string;
};

const LS_HINTS_ENABLED = "predibol_onboarding_hints_enabled";
const LS_VISITED_PICKS = "predibol_visited_picks";
const LS_VISITED_ALBUM = "predibol_visited_album";

export function enableOnboardingHintsForSession() {
  try {
    localStorage.setItem(LS_HINTS_ENABLED, "1");
  } catch {
    // ignore
  }
}

export function isOnboardingHintsEnabled(): boolean {
  try {
    return localStorage.getItem(LS_HINTS_ENABLED) === "1";
  } catch {
    return false;
  }
}

export function markVisitedPicks() {
  try {
    localStorage.setItem(LS_VISITED_PICKS, "1");
  } catch {
    // ignore
  }
}

export function markVisitedAlbum() {
  try {
    localStorage.setItem(LS_VISITED_ALBUM, "1");
  } catch {
    // ignore
  }
}

export function hasVisitedPicks(): boolean {
  try {
    return localStorage.getItem(LS_VISITED_PICKS) === "1";
  } catch {
    return false;
  }
}

export function hasVisitedAlbum(): boolean {
  try {
    return localStorage.getItem(LS_VISITED_ALBUM) === "1";
  } catch {
    return false;
  }
}

export default function OnboardingOverlay({
  locale,
  groupId,
  groupName,
  memberCount,
  exactPoints,
  isAdmin,
  onboardingCompletedAt,
  currentUserId,
}: Props) {
  const t = useTranslations("Onboarding");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const totalSteps = isAdmin ? 6 : 5;

  useEffect(() => {
    if (onboardingCompletedAt) return;
    setOpen(true);
    setStep(0);
  }, [onboardingCompletedAt]);

  useEffect(() => {
    if (!open) return;
    if (step !== (isAdmin ? 4 : 4)) return; // step 5 (0-indexed) is 4
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#10B981", "#06B6D4", "#EC4899", "#F97316"],
    });
  }, [open, step, isAdmin]);

  const title = useMemo(() => {
    if (step === 0) return t("step1.title", { groupName });
    if (step === 1) return t("step2.title");
    if (step === 2) return t("step3.title");
    if (step === 3) return t("step4.title");
    if (step === 4) return t("step5.title");
    return t("admin.title");
  }, [step, t, groupName]);

  const body = useMemo(() => {
    if (step === 0) {
      return (
        <>
          <p className="text-sm text-gray-400">{t("step1.subtitle", { memberCount })}</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("step1.primary")}
            </button>
          </div>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <p className="text-sm text-gray-400">{t("step2.body")}</p>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <span className="font-semibold">Mexico 2 - 1 South Africa</span>
            <span className="text-slate-500"> → </span>
            <span className="text-slate-300">{t("step2.example", { points: exactPoints })}</span>
          </div>
          <p className="mt-4 text-xs text-slate-500">{t("step2.hint")}</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("next")}
            </button>
          </div>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <p className="text-sm text-gray-400">{t("step3.body")}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <p>
              <span className="font-semibold">⚡ Double Down</span> — {t("step3.doubleDown")}
            </p>
            <p>
              <span className="font-semibold">🔍 Spy</span> — {t("step3.spy")}
            </p>
            <p>
              <span className="font-semibold">🛡️ Shield</span> — {t("step3.shield")}
            </p>
          </div>
          <p className="mt-3 text-sm text-gray-400">{t("step3.note")}</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("next")}
            </button>
          </div>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <p className="text-sm text-gray-400">{t("step4.body")}</p>
          <p className="mt-3 text-sm text-gray-400">{t("step4.plus")}</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
            >
              {t("next")}
            </button>
          </div>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <p className="text-sm text-gray-400">{t("step5.body")}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={`/${locale}/dashboard/group/${groupId}/predict`}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 ${PRIMARY_BUTTON_CLASSES}`}
              onClick={() => void completeOnboarding({ currentUserId, onDone: () => setOpen(false) })}
            >
              {t("step5.primary")}
            </Link>
            <button
              type="button"
              onClick={() => void completeOnboarding({ currentUserId, onDone: () => setOpen(false) })}
              className="text-sm font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              {t("step5.secondary")}
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setStep(5)}
                className="text-sm font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
              >
                {t("admin.next")}
              </button>
            ) : null}
          </div>
        </>
      );
    }

    return (
      <>
        <p className="text-sm text-gray-400">{t("admin.body")}</p>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void completeOnboarding({ currentUserId, onDone: () => setOpen(false) })}
            className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gpri px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 sm:w-auto ${PRIMARY_BUTTON_CLASSES}`}
          >
            {t("admin.primary")}
          </button>
        </div>
      </>
    );
  }, [step, t, memberCount, exactPoints, locale, groupId, isAdmin, currentUserId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(16,185,129,0.35),transparent_60%), radial-gradient(ellipse_80%_60%_at_50%_80%,rgba(236,72,153,0.18),transparent_60%)",
            }}
          />

          <button
            type="button"
            onClick={() => void completeOnboarding({ currentUserId, onDone: () => setOpen(false) })}
            className="absolute right-4 top-4 text-sm text-gray-500 hover:text-gray-300"
          >
            {t("skip")}
          </button>

          <div className="relative">
            <h2 className="text-2xl font-bold text-white">{title}</h2>

            <div className="mt-4">{body}</div>

            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ring-1 ring-inset ${
                    i === step ? "bg-gpri ring-gpri/40" : "bg-gray-700 ring-white/10"
                  }`}
                  aria-hidden
                />
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
              {t("progress", { current: Math.min(step + 1, totalSteps), total: totalSteps })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function completeOnboarding({ currentUserId, onDone }: { currentUserId: string; onDone: () => void }) {
  enableOnboardingHintsForSession();
  try {
    const supabase = createClient();
    await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", currentUserId);
  } catch {
    // ignore network errors; user should never be blocked
  } finally {
    onDone();
  }
}

