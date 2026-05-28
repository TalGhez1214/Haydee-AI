export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-[var(--bg-muted)] rounded mb-1.5" />
          <div className="h-4 w-44 bg-[var(--bg-muted)] rounded" />
        </div>
        <div className="h-9 w-32 bg-[var(--bg-muted)] rounded-[6px]" />
      </div>
      <div className="h-4 w-36 bg-[var(--bg-muted)] rounded mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5 h-36" />
        ))}
      </div>
      <div className="h-4 w-36 bg-[var(--bg-muted)] rounded mb-3" />
      <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] divide-y divide-[var(--border)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-5 py-4 h-14" />
        ))}
      </div>
    </div>
  )
}
