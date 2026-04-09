import { getTranslations } from "next-intl/server";
import { formatRelativeTime } from "@/lib/format-relative-time";

export type MemberActivityRow = {
  userId: string;
  displayName: string;
  predictionsSubmitted: number;
  totalMatches: number;
  picksComplete: boolean;
  lastActiveIso: string | null;
};

type Props = {
  locale: string;
  rows: MemberActivityRow[];
};

export default async function MemberActivitySection({ locale, rows }: Props) {
  const t = await getTranslations("AdminPage.activity");

  return (
    <section className="mt-8 rounded-xl border border-dark-600 bg-dark-900/40 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-white">{t("sectionTitle")}</h2>
      <p className="mt-1 text-sm text-slate-400">{t("sectionHint")}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-dark-600 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3">{t("displayName")}</th>
                <th className="pb-2 pr-3">{t("predictionsSubmitted")}</th>
                <th className="pb-2 pr-3">{t("progress")}</th>
                <th className="pb-2 pr-3">{t("picks")}</th>
                <th className="pb-2">{t("lastActive")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct =
                  row.totalMatches > 0
                    ? Math.min(100, Math.round((row.predictionsSubmitted / row.totalMatches) * 100))
                    : 0;
                return (
                  <tr key={row.userId} className="border-b border-dark-700/80">
                    <td className="py-3 pr-3 font-medium text-white">{row.displayName}</td>
                    <td className="py-3 pr-3 tabular-nums text-slate-300">
                      {row.predictionsSubmitted} / {row.totalMatches}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 min-w-[100px] flex-1 overflow-hidden rounded-full bg-dark-700">
                          <div
                            className="h-full rounded-full bg-gpri transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-300">
                      {row.picksComplete ? t("picksComplete") : t("picksPending")}
                    </td>
                    <td className="py-3 text-slate-400">
                      {row.lastActiveIso ? formatRelativeTime(row.lastActiveIso, locale) : t("never")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
