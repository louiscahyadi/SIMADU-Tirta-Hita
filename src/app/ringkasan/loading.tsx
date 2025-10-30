import { TableSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>

      {/* Title skeleton */}
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>

      {/* KPI Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card p-4 space-y-3">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
