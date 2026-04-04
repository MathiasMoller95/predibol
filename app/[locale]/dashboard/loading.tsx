import DelayedSkeleton from "@/components/ui/delayed-skeleton";
import Skeleton from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <DelayedSkeleton>
      <main className="min-h-screen bg-dark-900 px-4 py-8">
        <section className="mx-auto w-full max-w-6xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-28 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
          <Skeleton className="mx-auto mt-4 h-3 w-64 max-w-full" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3 rounded-xl border border-dark-600 bg-dark-800 p-4">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </DelayedSkeleton>
  );
}
