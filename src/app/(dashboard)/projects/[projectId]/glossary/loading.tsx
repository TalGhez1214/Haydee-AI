export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="h-4 w-32 bg-[var(--bg-muted)] rounded mb-5" />
      <div className="flex items-center justify-between mb-5">
        <div className="h-7 w-44 bg-[var(--bg-muted)] rounded" />
        <div className="h-4 w-32 bg-[var(--bg-muted)] rounded" />
      </div>
      <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] overflow-hidden">
        <div className="h-12 bg-[var(--bg-subtle)] border-b border-[var(--border)]" />
        <div className="divide-y divide-[var(--border)]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-5 py-4 h-16" />
          ))}
        </div>
      </div>
    </div>
  )
}
