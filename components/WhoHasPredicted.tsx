"use client";

export type WhoHasPredictedMember = { userId: string; displayName: string };

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

export default function WhoHasPredicted({
  groupMembers,
  predicted,
  currentUserId,
  tp,
  compact,
}: {
  matchId?: string;
  groupMembers: WhoHasPredictedMember[];
  predicted: string[];
  currentUserId: string;
  tp: TranslationFn;
  compact?: boolean;
}) {
  if (groupMembers.length <= 1) return null;
  const predictedSet = new Set(predicted);
  return (
    <div className={compact ? "mt-1.5" : "mt-3"}>
      {compact ? null : (
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {tp("groupPredictions.title")}
        </p>
      )}
      <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
        {groupMembers.map((m) => {
          const done = predictedSet.has(m.userId);
          const isYou = m.userId === currentUserId;
          const initials = m.displayName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <span
              key={m.userId}
              title={m.displayName}
              className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                done
                  ? "bg-gpri/20 text-gpri"
                  : "bg-dark-900/60 text-gray-600"
              } ${isYou ? "ring-1 ring-gpri/50" : ""}`}
            >
              {initials}
            </span>
          );
        })}
      </div>
    </div>
  );
}
