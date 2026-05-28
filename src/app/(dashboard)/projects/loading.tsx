export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-[var(--bg-muted)] rounded" />
        <div className="h-9 w-36 bg-[var(--bg-muted)] rounded-[6px]" />
      </div>
      <div className="h-9 w-48 bg-[var(--bg-muted)] rounded-[6px] mb-6" />
      <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] overflow-hidden">
        <div className="h-10 bg-[var(--bg-subtle)] border-b border-[var(--border)]" />
        <div className="divide-y divide-[var(--border)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 h-16" />
          ))}
        </div>
      </div>
    </div>
  )
}
