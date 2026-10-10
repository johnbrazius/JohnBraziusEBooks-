export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading ebooks">
      <div className="h-9 w-56 animate-pulse rounded bg-navy-100" />
      <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4] animate-pulse rounded bg-navy-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-navy-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-navy-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
