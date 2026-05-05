"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import {
  dataUrlToBlob,
  parsePendingGroupLogoPayload,
  PENDING_GROUP_LOGO_STORAGE_KEY,
  uploadGroupLogo,
} from "@/lib/group-logo-upload";

export default function PaymentSuccessPage() {
  const params = useParams<{ locale: string; groupId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("PaymentSuccess");
  const { showToast } = useToast();
  const [status, setStatus] = useState<"waiting" | "ok" | "stuck">("waiting");
  const fired = useRef(false);
  const logoHandled = useRef(false);

  const groupId = params.groupId as string;
  const locale = params.locale as string;
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const started = Date.now();

    async function tryPendingLogo() {
      if (logoHandled.current) return;
      logoHandled.current = true;
      const raw = sessionStorage.getItem(PENDING_GROUP_LOGO_STORAGE_KEY);
      const parsed = parsePendingGroupLogoPayload(raw);
      if (!parsed) {
        return;
      }
      if (parsed.groupId !== groupId) {
        sessionStorage.removeItem(PENDING_GROUP_LOGO_STORAGE_KEY);
        return;
      }
      const conv = dataUrlToBlob(parsed.dataUrl);
      if (!conv) {
        sessionStorage.removeItem(PENDING_GROUP_LOGO_STORAGE_KEY);
        return;
      }
      const { error } = await uploadGroupLogo(supabase, groupId, conv.blob, conv.contentType);
      if (error) {
        console.error("payment-success logo upload", error);
        showToast(t("logoUploadFailed"), "error");
        return;
      }
      sessionStorage.removeItem(PENDING_GROUP_LOGO_STORAGE_KEY);
    }

    async function tick() {
      const { data } = await supabase.from("groups").select("payment_status").eq("id", groupId).maybeSingle();
      const pay = (data?.payment_status as string | undefined) ?? "";
      if (cancelled) return;
      if (pay === "paid") {
        await tryPendingLogo();
        if (cancelled) return;
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
  }, [groupId, locale, router, sessionId, showToast, t]);

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
