import DelayedSkeleton from "@/components/ui/delayed-skeleton";
import Skeleton from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <DelayedSkeleton>
      <main className="min-h-screen bg-dark-900 px-4 py-8">
        <section className="mx-auto w-full max-w-5xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <Skeleton className="mt-10 h-11 w-full max-w-md rounded-lg" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 rounded-xl border border-dark-600 bg-dark-800 p-5">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </DelayedSkeleton>
  );
}
