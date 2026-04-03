"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDisplayNameForMemberInsert } from "@/lib/display-name";

type Props = {
  groupId: string;
  slug: string;
  autoJoin: boolean;
  isLoggedIn: boolean;
};

export default function JoinGroupButton({ groupId, slug, autoJoin, isLoggedIn }: Props) {
  const t = useTranslations("Groups");
  const locale = useLocale();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinGroup() {
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
  }

  useEffect(() => {
    if (autoJoin) {
      void joinGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin]);

  return (
    <div className="mt-6">
      {error ? <p className="mb-3 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        onClick={() => void joinGroup()}
        disabled={isJoining}
        className="min-h-[48px] w-full rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isJoining ? t("join.joiningButton") : t("join.joinButton")}
      </button>
    </div>
  );
}
