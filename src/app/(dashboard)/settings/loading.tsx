export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto p-6 pb-16 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="py-8 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="w-full sm:w-[200px] shrink-0">
              <div className="h-4 w-24 bg-[var(--bg-muted)] rounded mb-2" />
              <div className="h-3 w-36 bg-[var(--bg-muted)] rounded" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-9 w-full bg-[var(--bg-muted)] rounded-[6px]" />
              <div className="h-9 w-full bg-[var(--bg-muted)] rounded-[6px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
