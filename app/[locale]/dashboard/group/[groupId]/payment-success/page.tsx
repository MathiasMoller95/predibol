"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PaymentSuccessPage() {
  const params = useParams<{ locale: string; groupId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("PaymentSuccess");
  const [status, setStatus] = useState<"waiting" | "ok" | "stuck">("waiting");
  const fired = useRef(false);

  const groupId = params.groupId as string;
  const locale = params.locale as string;
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const started = Date.now();

    async function tick() {
      const { data } = await supabase.from("groups").select("payment_status").eq("id", groupId).maybeSingle();
      const pay = (data?.payment_status as string | undefined) ?? "";
      if (cancelled) return;
      if (pay === "paid") {
        setStatus("ok");
        if (!fired.current) {
          fired.current = true;
          void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
        window.setTimeout(() => {
          router.replace(`/${locale}/dashboard/group/${groupId}`);
        }, 1800);
        return;
      }
      if (Date.now() - started > 120_000) {
        setStatus("stuck");
        return;
      }
      window.setTimeout(tick, 2000);
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [groupId, locale, router, sessionId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dark-900 px-4 py-12">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-3 text-slate-400">
          {status === "waiting" ? t("waiting") : status === "ok" ? t("subtitle") : t("failed")}
        </p>
      </div>
    </main>
  );
}
