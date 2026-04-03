"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDisplayNameForMemberInsert } from "@/lib/display-name";

export type DiscoverGroupRow = {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  description: string;
  admin_id: string;
  memberCount: number;
  isMember: boolean;
};

type Props = {
  locale: string;
  currentUserId: string;
  userEmail: string | undefined;
  groups: DiscoverGroupRow[];
};

export default function DiscoverGroupList({ locale, currentUserId, userEmail, groups }: Props) {
  const t = useTranslations("Discover");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(groups);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [justJoinedId, setJustJoinedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((g) => g.name.toLowerCase().includes(q));
  }, [query, rows]);

  async function onJoin(group: DiscoverGroupRow) {
    if (group.isMember || busyId) return;
    setBusyId(group.id);
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[group.id];
      return next;
    });

    const supabase = createClient();
    const displayName = await getDisplayNameForMemberInsert(supabase, currentUserId, userEmail);
    const { error } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: currentUserId,
      display_name: displayName,
    });

    if (error && error.code !== "23505") {
      setErrorById((prev) => ({ ...prev, [group.id]: error.message }));
      setBusyId(null);
      return;
    }

    setRows((prev) => prev.map((g) => (g.id === group.id ? { ...g, isMember: true } : g)));
    setJustJoinedId(group.id);
    setBusyId(null);
    window.setTimeout(() => {
      setJustJoinedId(null);
      router.replace(`/${locale}/dashboard/group/${group.id}`);
    }, 1000);
  }

  if (groups.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dark-600 bg-dark-800 p-8 text-center">
        <p className="text-slate-400">{t("noGroups")}</p>
        <Link
          href={`/${locale}/dashboard/create-group`}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          {t("createGroup")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full max-w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:max-w-md"
        aria-label={t("searchPlaceholder")}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((group) => {
          const accent = group.primary_color ?? "#16a34a";
          const err = errorById[group.id];
          const body = (
            <>
              <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl" style={{ backgroundColor: accent }} />
              <div className="pl-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{group.name}</h3>
                  {group.isMember ? (
                    <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {t("alreadyMember")}
                    </span>
                  ) : null}
                </div>
                {group.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-slate-400">{group.description}</p>
                ) : null}
                <p className="mt-3 text-sm text-slate-500">👥 {t("memberCount", { count: group.memberCount })}</p>
                {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
                {justJoinedId === group.id ? (
                  <p className="mt-2 text-sm font-medium text-emerald-400">{t("joined")}</p>
                ) : null}

                {!group.isMember ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void onJoin(group)}
                    className="mt-4 min-h-[44px] w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {t("join")}
                  </button>
                ) : null}
              </div>
            </>
          );

          if (group.isMember) {
            return (
              <Link
                key={group.id}
                href={`/${locale}/dashboard/group/${group.id}`}
                className="relative block overflow-hidden rounded-xl border border-dark-600 bg-dark-800 p-5 transition-all duration-200 hover:border-emerald-800 hover:bg-dark-700"
              >
                {body}
              </Link>
            );
          }

          return (
            <div key={group.id} className="relative overflow-hidden rounded-xl border border-dark-600 bg-dark-800 p-5">
              {body}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">{t("noSearchResults")}</p>
      ) : null}
    </div>
  );
}
