export default function Loading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="h-4 w-32 bg-[var(--bg-muted)] rounded" />
        <div className="h-4 w-28 bg-[var(--bg-muted)] rounded" />
      </div>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-56 flex-shrink-0 bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] divide-y divide-[var(--border)]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-3 h-12" />
          ))}
        </div>
        <div className="flex-1 bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-8">
          <div className="max-w-[680px] space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-5 bg-[var(--bg-muted)] rounded"
                style={{ width: `${70 + (i % 3) * 10}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
