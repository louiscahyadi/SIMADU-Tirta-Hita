export default function Loading() {
  return (
    <div className="space-y-6 p-4">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>

      {/* Title skeleton */}
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 md:col-span-2">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-48 bg-gray-100 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
