import { CardSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-4">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>

      {/* Title skeleton */}
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>

      {/* KPI Cards skeleton */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-3 space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Recent items skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={3} />
      </div>
    </div>
  );
}
