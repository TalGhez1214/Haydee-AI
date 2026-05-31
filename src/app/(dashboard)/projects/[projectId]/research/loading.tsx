export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="h-4 w-32 bg-[var(--bg-muted)] rounded mb-5" />
      <div className="flex items-center justify-between mb-5">
        <div className="h-7 w-48 bg-[var(--bg-muted)] rounded" />
        <div className="h-4 w-16 bg-[var(--bg-muted)] rounded" />
      </div>
      <div className="flex gap-4 h-[600px]">
        <div className="w-72 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--bg-muted)] rounded-card" />
          ))}
        </div>
        <div className="flex-1 bg-[var(--bg-muted)] rounded-card" />
      </div>
    </div>
  )
}
