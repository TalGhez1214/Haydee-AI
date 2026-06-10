export function ProjectNavSkeleton() {
  return (
    <div className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      {/* Row 1 — Title bar */}
      <div className="flex h-14 items-center justify-between px-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="h-3 w-14 bg-[var(--bg-muted)] rounded animate-pulse" />
          <span className="text-[var(--border-strong)]">/</span>
          <div className="h-4 w-44 bg-[var(--bg-muted)] rounded animate-pulse" />
        </div>
        <div className="h-7 w-7 bg-[var(--bg-muted)] rounded-full animate-pulse" />
      </div>

      {/* Row 2 — Tab bar */}
      <div className="flex items-center gap-1 px-6 h-9 border-b border-[var(--border)] bg-[var(--bg)]">
        {[80, 72, 60, 90, 68, 48, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 bg-[var(--bg-muted)] rounded animate-pulse mx-1.5"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Row 3 — Progress strip */}
      <div className="flex h-10 items-center px-6 bg-[var(--bg-subtle)]">
        <div className="w-32 h-1.5 bg-[var(--bg-muted)] rounded-full animate-pulse" />
      </div>
    </div>
  )
}
