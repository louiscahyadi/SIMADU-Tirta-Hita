import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>

      {/* Title skeleton */}
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card p-4 space-y-4">
        <LoadingSkeleton type="table" rows={10} />
      </div>
    </div>
  );
}
