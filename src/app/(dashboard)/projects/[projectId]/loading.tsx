export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="h-4 w-24 bg-[var(--bg-muted)] rounded mb-5" />
      <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-7 w-64 bg-[var(--bg-muted)] rounded mb-2" />
            <div className="h-4 w-40 bg-[var(--bg-muted)] rounded mb-1" />
            <div className="h-4 w-32 bg-[var(--bg-muted)] rounded" />
          </div>
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 w-12 bg-[var(--bg-muted)] rounded mx-auto mb-1" />
                <div className="h-3 w-16 bg-[var(--bg-muted)] rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5 h-32" />
        ))}
      </div>
    </div>
  )
}
