import DelayedSkeleton from "@/components/ui/delayed-skeleton";
import Skeleton from "@/components/ui/skeleton";

export default function PredictLoading() {
  return (
    <DelayedSkeleton>
      <main className="min-h-screen bg-dark-900 px-4 py-8">
        <section className="mx-auto w-full max-w-4xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-8 w-56" />
          <Skeleton className="mt-2 h-3 w-64" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </section>
      </main>
    </DelayedSkeleton>
  );
}
