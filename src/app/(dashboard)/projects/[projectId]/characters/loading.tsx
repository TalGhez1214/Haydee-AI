export default function Loading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="h-4 w-32 bg-[var(--bg-muted)] rounded mb-5 flex-shrink-0" />
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="h-7 w-48 bg-[var(--bg-muted)] rounded" />
        <div className="h-4 w-24 bg-[var(--bg-muted)] rounded" />
      </div>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-72 flex-shrink-0 bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] divide-y divide-[var(--border)]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3 h-14" />
          ))}
        </div>
        <div className="flex-1 bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-6" />
      </div>
    </div>
  )
}
