export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-4 w-32 bg-[var(--bg-muted)] rounded mb-5" />
      <div className="flex items-center justify-between mb-5">
        <div className="h-7 w-28 bg-[var(--bg-muted)] rounded" />
        <div className="h-4 w-24 bg-[var(--bg-muted)] rounded" />
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-4 h-16"
          />
        ))}
      </div>
    </div>
  )
}
