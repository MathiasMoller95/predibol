"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export type SAGroup = {
  id: string;
  name: string;
  adminName: string;
  members: number;
  predictions: number;
  accessMode: "open" | "protected";
  createdAt: string;
};

type Props = {
  groups: SAGroup[];
  locale: string;
};

export default function GroupsOverview({ groups, locale }: Props) {
  const t = useTranslations("SuperAdmin");

  return (
    <section className="rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">{t("groups.title")}</h2>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dark-600 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-4 font-medium">{t("groups.name")}</th>
              <th className="pb-2 pr-4 font-medium">{t("groups.admin")}</th>
              <th className="pb-2 pr-4 font-medium text-right">{t("groups.members")}</th>
              <th className="pb-2 pr-4 font-medium text-right">{t("groups.predictions")}</th>
              <th className="pb-2 pr-4 font-medium">{t("groups.access")}</th>
              <th className="pb-2 font-medium">{t("groups.created")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-b border-dark-700 last:border-0">
                <td className="py-2.5 pr-4">
                  <Link
                    href={`/${locale}/dashboard/group/${g.id}`}
                    className="font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    {g.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-slate-300">{g.adminName}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-slate-300">{g.members}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-slate-300">{g.predictions}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      g.accessMode === "open"
                        ? "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-700/50"
                        : "bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/50"
                    }`}
                  >
                    {g.accessMode === "open" ? t("groups.open") : t("groups.protected")}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-slate-400">
                  {new Date(g.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
