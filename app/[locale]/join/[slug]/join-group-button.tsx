"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  groupId: string;
  slug: string;
  autoJoin: boolean;
  isLoggedIn: boolean;
};

function getDisplayName(email: string | undefined, metadata: Record<string, unknown> | undefined) {
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  if (email && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Player";
}

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

    const { error: joinError } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      display_name: getDisplayName(user.email, user.user_metadata),
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
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={() => void joinGroup()}
        disabled={isJoining}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isJoining ? t("join.joiningButton") : t("join.joinButton")}
      </button>
    </div>
  );
}
