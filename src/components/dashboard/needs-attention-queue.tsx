import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { IconAlertTriangle, IconBook2, IconChevronRight } from '@tabler/icons-react'

export interface AttentionItem {
  id: string
  type: 'flag' | 'glossary'
  project_id: string
  project_title: string
  label: string
  severity?: 'high' | 'medium' | 'low'
}

export function NeedsAttentionQueue({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5">
        <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-3">
          Needs Attention
        </h2>
        <p className="text-[12px] text-[var(--text-tertiary)]">
          Everything looks good — nothing needs attention right now.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg)] rounded-card shadow-card border border-[var(--border)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-medium text-[var(--text-primary)]">Needs Attention</h2>
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={
              item.type === 'flag'
                ? `/projects/${item.project_id}/culture-queue`
                : `/projects/${item.project_id}/glossary`
            }
            className="flex items-center gap-3 px-3 py-2.5 -mx-1 rounded-[6px] hover:bg-[var(--bg-subtle)] transition-colors duration-quick group"
          >
            <div
              className={`flex-shrink-0 ${
                item.type === 'flag' ? 'text-danger' : 'text-warning'
              }`}
            >
              {item.type === 'flag' ? (
                <IconAlertTriangle size={14} />
              ) : (
                <IconBook2 size={14} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[var(--text-primary)] truncate">{item.label}</p>
              <p className="text-[12px] text-[var(--text-secondary)] truncate">
                {item.project_title}
              </p>
            </div>
            {item.severity && <Badge variant={item.severity} />}
            <IconChevronRight
              size={14}
              className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
