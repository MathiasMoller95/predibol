import { getTranslations } from "next-intl/server";
import type { TierKey } from "@/types/database-enums";

type Props = {
  locale: string;
  tier: TierKey;
  memberLimit: number;
  memberCount: number;
};

export default async function GroupPlanPanel({ locale, tier, memberLimit, memberCount }: Props) {
  const tp = await getTranslations({ locale, namespace: "Pricing" });
  const tierName = tp(`tierNames.${tier}`);
  const usageRatio = memberLimit > 0 ? memberCount / memberLimit : 0;
  const almostFull = usageRatio > 0.8;

  return (
    <section className="mt-8 rounded-xl border border-dark-600 bg-dark-800/80 p-5">
      <h2 className="text-lg font-semibold text-white">{tp("currentPlan")}</h2>
      <p className="mt-2 text-sm text-slate-300">
        {tp("planTierLabel", { tierName, limit: memberLimit })}
      </p>
      <p className="mt-1 font-mono text-sm text-emerald-400">
        {tp("planUsage", { count: memberCount, limit: memberLimit })}
      </p>
      {almostFull ? (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {tp("almostFull")}
        </p>
      ) : null}
      <div className="mt-4 border-t border-dark-600 pt-4">
        <p className="text-sm text-slate-400">{tp("upgradeContact")}</p>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          <a className="text-emerald-400 hover:underline" href="mailto:mnmoller@uc.cl">
            mnmoller@uc.cl
          </a>
          <a
            className="text-emerald-400 hover:underline"
            href="https://wa.me/56991959923?text=Hi!%20I%27d%20like%20to%20upgrade%20my%20Predibol%20group%20plan"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp +56 9 9195 9923
          </a>
        </p>
      </div>
    </section>
  );
}
