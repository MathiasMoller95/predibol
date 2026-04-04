"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDisplayNameForMemberInsert } from "@/lib/display-name";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import type { GroupAccessMode } from "@/types/supabase";

type Props = {
  groupId: string;
  slug: string;
  accessMode: GroupAccessMode;
  autoJoin: boolean;
  isLoggedIn: boolean;
};

function JoinAccessCodeInputs({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusAt = (index: number) => {
    const el = refs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Access code">
      {digits.map((d, i) => (
        <input
          // eslint-disable-next-line react/no-array-index-key -- fixed 6 slots
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            const char = raw.slice(-1) ?? "";
            const prefix = value.slice(0, i);
            const suffix = value.slice(i + 1);
            const next = `${prefix}${char}${suffix}`.slice(0, 6);
            onChange(next);
            if (char && i < 5) {
              focusAt(i + 1);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) {
              e.preventDefault();
              focusAt(i - 1);
              onChange(`${value.slice(0, i - 1)}${value.slice(i)}`);
            }
          }}
          onFocus={(e) => e.target.select()}
          className="h-14 w-12 rounded-lg border-2 border-gray-600 bg-[#111720] text-center font-mono text-2xl text-white outline-none transition focus:border-emerald-500 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function JoinGroupButton({ groupId, slug, accessMode, autoJoin, isLoggedIn }: Props) {
  const t = useTranslations("Groups");
  const ta = useTranslations("AccessCode");
  const locale = useLocale();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState("");

  const codeComplete = enteredCode.length === 6;
  const joinDisabled = isJoining || (accessMode === "protected" && !codeComplete);

  const joinGroup = useCallback(async () => {
    if (isJoining) {
      return;
    }

    setIsJoining(true);
    setError(null);

    if (!isLoggedIn) {
      const nextPath = `/${locale}/join/${slug}?autoJoin=1`;
      router.replace(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const nextPath = `/${locale}/join/${slug}?autoJoin=1`;
      router.replace(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (accessMode === "protected") {
      const { data: ok, error: verifyError } = await supabase.rpc("verify_group_access_code", {
        group_slug: slug,
        entered_code: enteredCode,
      });

      if (verifyError) {
        setError(verifyError.message);
        setIsJoining(false);
        return;
      }
      if (ok !== true) {
        setError(ta("incorrectCode"));
        setIsJoining(false);
        return;
      }
    }

    const displayName = await getDisplayNameForMemberInsert(supabase, user.id, user.email);

    const { error: joinError } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      display_name: displayName,
    });

    if (joinError && joinError.code !== "23505") {
      setError(joinError.message);
      setIsJoining(false);
      return;
    }

    router.replace(`/${locale}/dashboard/group/${groupId}`);
  }, [
    accessMode,
    enteredCode,
    groupId,
    isJoining,
    isLoggedIn,
    locale,
    router,
    slug,
    ta,
  ]);

  useEffect(() => {
    if (autoJoin && accessMode === "open") {
      void joinGroup();
    }
    // Only auto-attempt once per mount when the URL requests it for open groups.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce joinGroup would retrigger on every code keystroke
  }, [autoJoin, accessMode]);

  return (
    <div className="mt-6">
      {accessMode === "protected" ? (
        <div className="mb-4 space-y-3">
          <JoinAccessCodeInputs value={enteredCode} onChange={setEnteredCode} disabled={isJoining} />
          <p className="text-center text-sm text-slate-400">{ta("enterCode")}</p>
        </div>
      ) : null}
      {error ? <p className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        onClick={() => void joinGroup()}
        disabled={joinDisabled}
        className={`min-h-[48px] w-full rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400 ${PRIMARY_BUTTON_CLASSES}`}
      >
        {isJoining ? t("join.joiningButton") : t("join.joinButton")}
      </button>
    </div>
  );
}
