interface UsageStatsProps {
  usage: {
    totalJobs: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="text-[22px] font-semibold text-[var(--text-primary)] mt-1">{value}</p>
    </div>
  )
}

export function UsageStats({ usage }: UsageStatsProps) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="AI Jobs" value={usage.totalJobs.toLocaleString()} />
        <StatTile label="Input Tokens" value={usage.inputTokens.toLocaleString()} />
        <StatTile label="Output Tokens" value={usage.outputTokens.toLocaleString()} />
        <StatTile label="Est. Cost" value={`$${usage.costUsd.toFixed(4)}`} />
      </div>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-3">
        Stats reflect the current calendar month to date.
      </p>
    </div>
  )
}
