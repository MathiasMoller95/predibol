"use client";

export type WhoHasPredictedMember = { userId: string; displayName: string };

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

export default function WhoHasPredicted({
  groupMembers,
  predicted,
  currentUserId,
  tp,
}: {
  matchId?: string;
  groupMembers: WhoHasPredictedMember[];
  predicted: string[];
  currentUserId: string;
  tp: TranslationFn;
}) {
  if (groupMembers.length <= 1) return null;
  const predictedSet = new Set(predicted);
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {tp("groupPredictions.title")}
      </p>
      <div className="flex flex-wrap gap-1.5">
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
