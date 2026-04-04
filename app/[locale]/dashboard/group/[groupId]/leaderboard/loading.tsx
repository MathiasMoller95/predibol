import DelayedSkeleton from "@/components/ui/delayed-skeleton";
import Skeleton from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <DelayedSkeleton>
      <main className="min-h-screen bg-dark-900 px-4 py-8">
        <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-8 w-48" />
          <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          <div className="mt-8 overflow-hidden rounded-xl border border-dark-600">
            <div className="grid grid-cols-6 gap-2 border-b border-dark-600 bg-dark-700 px-4 py-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3" />
              ))}
            </div>
            <div className="divide-y divide-dark-600 bg-dark-800">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-6 items-center gap-2 px-4 py-3">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-10 justify-self-end" />
                  <Skeleton className="h-4 w-8 justify-self-end" />
                  <Skeleton className="h-4 w-8 justify-self-end" />
                  <Skeleton className="h-4 w-8 justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </DelayedSkeleton>
  );
}
