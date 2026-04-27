"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, Home, Star, Target, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
  groupId: string;
};

const SEGMENTS = ["hub", "predict", "leaderboard", "bracket", "picks"] as const;
type Segment = (typeof SEGMENTS)[number];

const ICONS: Record<Segment, typeof Target> = {
  hub: Home,
  predict: Target,
  leaderboard: Trophy,
  bracket: GitBranch,
  picks: Star,
};

const LABEL_KEYS: Record<Segment, "group" | "matches" | "ranking" | "bracket" | "champion"> = {
  hub: "group",
  predict: "matches",
  leaderboard: "ranking",
  bracket: "bracket",
  picks: "champion",
};

function normalizePath(p: string) {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

export default function GroupBottomNav({ locale, groupId }: Props) {
  const pathname = usePathname();
  const t = useTranslations("GroupBottomNav");
  const base = `/${locale}/dashboard/group/${groupId}`;
  const path = normalizePath(pathname);

  function isActive(segment: Segment): boolean {
    if (segment === "hub") return path === base;
    if (path === base) return false;
    const prefix = `${base}/${segment}`;
    return path === prefix || path.startsWith(`${prefix}/`);
  }

  function hrefFor(segment: Segment): string {
    return segment === "hub" ? base : `${base}/${segment}`;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#111720] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label={t("navAria")}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0 px-1 pt-1">
        {SEGMENTS.map((segment) => {
          const href = hrefFor(segment);
          const active = isActive(segment);
          const Icon = ICONS[segment];
          const labelKey = LABEL_KEYS[segment];
          return (
            <li key={segment} className="min-w-0 flex-1">
              <Link
                href={href}
                scroll={!active}
                onClick={(e) => {
                  if (active) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium leading-tight ${
                  active ? "text-gpri" : "text-[#6B7280]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="truncate">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
